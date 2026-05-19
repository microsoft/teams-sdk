import { confirm } from '@inquirer/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import { applyManifestUpdate, type ApplyManifestUpdateResult, type UnpreservedManifestChange } from '../../../apps/manifest-update.js';
import { pickApp } from '../../../utils/app-picker.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { isAutoConfirm, isInteractive } from '../../../utils/interactive.js';
import { outputJson } from '../../../utils/json-output.js';
import { logger } from '../../../utils/logger.js';
import { createSilentSpinner } from '../../../utils/spinner.js';
import type { ManifestChange } from '../../../apps/manifest-mutate.js';

interface ManifestUpdateOptions {
  setJson: string[];
  remove: string[];
  dryRun?: boolean;
  json?: boolean;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  return JSON.stringify(value, null, 2) ?? String(value);
}

function printChangeGroup(title: string, changes: ManifestChange[]): void {
  if (changes.length === 0) return;

  logger.info(`\n  ${pc.bold(title)}:`);
  for (const change of changes) {
    logger.info(`    ${pc.cyan(change.path)}`);
    if (change.kind === 'added') {
      logger.info(pc.green(`      + ${formatValue(change.newValue)}`));
    } else if (change.kind === 'removed') {
      logger.info(pc.red(`      - ${formatValue(change.oldValue)}`));
    } else {
      logger.info(pc.red(`      - ${formatValue(change.oldValue)}`));
      logger.info(pc.green(`      + ${formatValue(change.newValue)}`));
    }
  }
}

function printChangeSummary(result: ApplyManifestUpdateResult): void {
  logger.info(pc.bold('Manifest changes:'));
  printChangeGroup('Added', result.changes.filter((change) => change.kind === 'added'));
  printChangeGroup('Updated', result.changes.filter((change) => change.kind === 'updated'));
  printChangeGroup('Removed', result.changes.filter((change) => change.kind === 'removed'));

  if (result.versionBumped && result.previousVersion && result.version) {
    logger.info(`\n${pc.dim('Version will be bumped:')} ${result.previousVersion} → ${result.version}`);
  }
}

function printUnpreservedChanges(unpreservedChanges: UnpreservedManifestChange[] | undefined): void {
  if (!unpreservedChanges || unpreservedChanges.length === 0) return;

  logger.warn(pc.yellow('\nManifest uploaded, but some changes were not preserved by the service:'));
  for (const change of unpreservedChanges) {
    logger.warn(`\n  ${pc.cyan(change.path)}`);
    logger.warn(pc.dim(`    expected: ${formatValue(change.expected)}`));
    logger.warn(pc.dim(`    actual: ${formatValue(change.actual)}`));
  }
}

async function resolveAppAndToken(
  appIdArg: string | undefined,
  json: boolean | undefined
): Promise<{ teamsAppId: string; token: string }> {
  if (appIdArg) {
    const account = await getAccount();
    if (!account) {
      throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
    }

    const token = await getTokenSilent(teamsDevPortalScopes);
    if (!token) {
      throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
    }

    return { teamsAppId: appIdArg, token };
  }

  if (json) {
    throw new CliError('VALIDATION_MISSING', 'appId is required in --json mode.');
  }

  const picked = await pickApp();
  return { teamsAppId: picked.app.teamsAppId, token: picked.token };
}

export const manifestUpdateCommand = new Command('update')
  .description('Update a Teams app manifest with path-based mutations')
  .argument('[appId]', 'Teams app ID (prompted if not provided)')
  .option('--set-json <path=json>', '[OPTIONAL] Set a manifest field using parsed JSON', collect, [])
  .option('--remove <path>', '[OPTIONAL] Remove a manifest field or array item', collect, [])
  .option('--dry-run', '[OPTIONAL] Preview changes without uploading')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (appIdArg: string | undefined, options: ManifestUpdateOptions) => {
      const hasMutations = options.setJson.length > 0 || options.remove.length > 0;

      if (!hasMutations) {
        throw new CliError(
          'VALIDATION_MISSING',
          'At least one mutation is required (--set-json or --remove).'
        );
      }

      const autoConfirm = isAutoConfirm();
      if (options.json && !options.dryRun && !autoConfirm) {
        throw new CliError(
          'VALIDATION_MISSING',
          '--json manifest updates require --yes, or use --dry-run.'
        );
      }

      if (!options.dryRun && !autoConfirm && !isInteractive()) {
        throw new CliError(
          'VALIDATION_MISSING',
          'Manifest update requires --yes in non-interactive mode.',
          'Use --yes to apply changes, or --dry-run to preview without uploading.'
        );
      }

      const { teamsAppId, token } = await resolveAppAndToken(appIdArg, options.json);
      const silent = !!options.json;
      const previewOnly = !!options.dryRun || !autoConfirm;

      const spinner = createSilentSpinner(
        previewOnly ? 'Preparing manifest changes...' : 'Updating manifest...',
        silent
      ).start();

      let result: ApplyManifestUpdateResult;
      try {
        result = await applyManifestUpdate({
          token,
          teamsAppId,
          mutations: { setJson: options.setJson, remove: options.remove },
          dryRun: previewOnly,
        });
      } catch (error) {
        spinner.error({ text: options.dryRun ? 'Dry run failed' : 'Manifest update failed' });
        throw error;
      }
      spinner.stop();

      if (result.changes.length === 0) {
        if (options.json) {
          outputJson(result);
        } else {
          logger.info(pc.dim('No manifest changes detected.'));
        }
        return;
      }

      if (options.json) {
        outputJson(result);
        return;
      }

      printChangeSummary(result);

      if (options.dryRun) {
        logger.info(`\n${pc.dim('Dry run only. No changes uploaded.')}`);
        logger.info(JSON.stringify(result.manifest, null, 2));
        return;
      }

      if (!autoConfirm) {
        const approved = await confirm({ message: 'Apply these manifest changes?', default: true });
        if (!approved) {
          logger.info(pc.dim('No changes uploaded.'));
          return;
        }

        const uploadSpinner = createSilentSpinner('Uploading manifest...', silent).start();
        try {
          result = await applyManifestUpdate({
            token,
            teamsAppId,
            mutations: { setJson: options.setJson, remove: options.remove },
          });
        } catch (error) {
          uploadSpinner.error({ text: 'Upload failed' });
          throw error;
        }
        uploadSpinner.success({ text: 'Manifest uploaded' });
      }

      logger.info(pc.green(`Manifest applied to app ${pc.bold(teamsAppId)}`));
      printUnpreservedChanges(result.unpreservedChanges);
    })
  );
