import { Command } from 'commander';
import { select, checkbox, Separator } from '@inquirer/prompts';
import pc from 'picocolors';
import { createSilentSpinner } from '../../../utils/spinner.js';
import { logger } from '../../../utils/logger.js';
import { CliError, wrapAction } from '../../../utils/errors.js';
import { outputJson } from '../../../utils/json-output.js';
import { getAccount, getTokenSilent, teamsDevPortalScopes } from '../../../auth/index.js';
import {
  inferScope,
  findPermission,
  getPermissionsForScope,
  type RscScope,
} from '../../../apps/rsc-catalog.js';
import type { RscPermissionEntry, AppSummary } from '../../../apps/types.js';
import {
  listRscPermissions,
  addRscPermissions,
  removeRscPermissions,
  setRscPermissions,
  diffRscPermissions,
} from './actions.js';

// ─── Interactive menu ───────────────────────────────────────────────

/**
 * Show the RSC permissions interactive menu for an app.
 * Flow: pick scope → toggle permissions on/off → save diff.
 */
export async function showRscMenu(app: AppSummary, token: string): Promise<void> {
  while (true) {
    const scope = await select<RscScope | 'view' | 'back'>({
      message: `${app.appName ?? 'Unnamed'} — Permissions (RSC):`,
      choices: [
        { name: 'View current permissions', value: 'view' },
        new Separator(),
        { name: 'Edit Team permissions', value: 'Team' },
        { name: 'Edit Chat / Meeting permissions', value: 'Chat' },
        { name: 'Edit User permissions', value: 'User' },
        new Separator(),
        { name: 'Back', value: 'back' },
      ],
    });

    if (scope === 'back') return;

    if (scope === 'view') {
      await viewPermissions(token, app.teamsAppId);
    } else {
      await editScopePermissions(token, app.teamsAppId, scope);
    }
  }
}

async function viewPermissions(token: string, teamsAppId: string): Promise<void> {
  const spinner = createSilentSpinner('Fetching RSC permissions...').start();
  const permissions = await listRscPermissions(token, teamsAppId);
  spinner.stop();

  if (permissions.length === 0) {
    logger.info(pc.dim('No RSC permissions configured.'));
    return;
  }

  printPermissionsTable(permissions);
}

function printPermissionsTable(permissions: RscPermissionEntry[]): void {
  const rows = permissions.map((p) => ({
    name: p.name,
    scope: inferScope(p.name) ?? 'Unknown',
    type: p.type,
    inCatalog: findPermission(p.name) !== null,
  }));

  const nameCol = Math.max('Name'.length, ...rows.map((r) => r.name.length));
  const scopeCol = Math.max('Scope'.length, ...rows.map((r) => r.scope.length));

  logger.info(pc.bold(`${'Name'.padEnd(nameCol + 2)}${'Scope'.padEnd(scopeCol + 2)}Type`));
  logger.info(pc.dim('─'.repeat(nameCol + scopeCol + 2 + 2 + 'Application'.length)));
  for (const row of rows) {
    const suffix = row.inCatalog ? '' : ` ${pc.dim('(not in catalog)')}`;
    logger.info(
      `${row.name.padEnd(nameCol + 2)}${row.scope.padEnd(scopeCol + 2)}${row.type}${suffix}`
    );
  }
}

/**
 * Show all permissions for a scope as a single checkbox list.
 * Already-enabled permissions are pre-checked.
 * Computes the diff on submit: newly checked = add, newly unchecked = remove.
 */
async function editScopePermissions(
  token: string,
  teamsAppId: string,
  scope: RscScope
): Promise<void> {
  const spinner = createSilentSpinner('Fetching RSC permissions...').start();
  const current = await listRscPermissions(token, teamsAppId);
  spinner.stop();

  // Composite key for dedup: "name|type"
  const currentKeys = new Set(current.map((p) => `${p.name}|${p.type}`));
  const catalog = getPermissionsForScope(scope);
  const scopeSuffix = scope === 'Team' ? '.Group' : scope === 'Chat' ? '.Chat' : '.User';

  // Track which current scope permissions are in the catalog
  const catalogNames = new Set([
    ...catalog.Application.map((p) => p.name),
    ...catalog.Delegated.map((p) => p.name),
  ]);

  // Build checkbox choices with current permissions pre-checked
  const choices: Array<{ name: string; value: RscPermissionEntry; checked?: boolean } | Separator> =
    [];

  if (catalog.Application.length > 0) {
    choices.push(new Separator(pc.bold('── Application ──')));
    for (const perm of catalog.Application) {
      choices.push({
        name: `${perm.displayName} ${pc.dim(`(${perm.name})`)}`,
        value: { name: perm.name, type: 'Application' },
        checked: currentKeys.has(`${perm.name}|Application`),
      });
    }
  }

  if (catalog.Delegated.length > 0) {
    choices.push(new Separator(pc.bold('── Delegated ──')));
    for (const perm of catalog.Delegated) {
      choices.push({
        name: `${perm.displayName} ${pc.dim(`(${perm.name})`)}`,
        value: { name: perm.name, type: 'Delegated' },
        checked: currentKeys.has(`${perm.name}|Delegated`),
      });
    }
  }

  // Include unknown permissions (in this scope but not in catalog) as pre-checked
  const unknownPerms = current.filter(
    (p) => p.name.endsWith(scopeSuffix) && !catalogNames.has(p.name)
  );
  if (unknownPerms.length > 0) {
    choices.push(new Separator(pc.bold('── Other (not in catalog) ──')));
    for (const perm of unknownPerms) {
      choices.push({
        name: `${perm.name} ${pc.dim(`(${perm.type})`)}`,
        value: { name: perm.name, type: perm.type },
        checked: true,
      });
    }
  }

  const selected = await checkbox<RscPermissionEntry>({
    message: `${scope} RSC permissions (space to toggle, enter to save):`,
    choices,
  });

  // Compute diff using composite keys
  const selectedKeys = new Set(selected.map((p) => `${p.name}|${p.type}`));
  const currentScopePerms = current.filter((p) => p.name.endsWith(scopeSuffix));
  const currentScopeKeys = new Set(currentScopePerms.map((p) => `${p.name}|${p.type}`));

  const toAdd = selected.filter((p) => !currentScopeKeys.has(`${p.name}|${p.type}`));
  const toRemoveKeys = new Set([...currentScopeKeys].filter((key) => !selectedKeys.has(key)));

  if (toAdd.length === 0 && toRemoveKeys.size === 0) {
    logger.info(pc.dim('No changes.'));
    return;
  }

  // Atomic update: keep non-scope perms + selected scope perms
  const otherScopePerms = current.filter((p) => !p.name.endsWith(scopeSuffix));
  const finalPerms = [...otherScopePerms, ...selected];

  const updateSpinner = createSilentSpinner('Updating RSC permissions...').start();
  await setRscPermissions(token, teamsAppId, finalPerms);

  const parts: string[] = [];
  if (toAdd.length > 0) parts.push(`added ${toAdd.length}`);
  if (toRemoveKeys.size > 0) parts.push(`removed ${toRemoveKeys.size}`);
  updateSpinner.success({ text: `RSC permissions updated (${parts.join(', ')}).` });
}

// ─── Helpers ────────────────────────────────────────────────────────

async function requireToken(): Promise<string> {
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }
  const token = await getTokenSilent(teamsDevPortalScopes);
  if (!token) {
    throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
  }
  return token;
}

// ─── CLI subcommands ────────────────────────────────────────────────

interface RscListOptions {
  json?: boolean;
}

interface RscAddOptions {
  type: 'Application' | 'Delegated';
  json?: boolean;
}

interface RscRemoveOptions {
  json?: boolean;
}

interface RscAddOutput {
  added: RscPermissionEntry[];
  skipped: RscPermissionEntry[];
}

interface RscRemoveOutput {
  removed: string[];
  notFound: string[];
}

const rscListCommand = new Command('list')
  .description('List RSC permissions for an app')
  .argument('<teamsAppId>', 'Teams app ID')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (teamsAppId: string, options: RscListOptions) => {
      const token = await requireToken();
      const permissions = await listRscPermissions(token, teamsAppId);

      if (options.json) {
        outputJson(permissions);
        return;
      }

      if (permissions.length === 0) {
        logger.info(pc.dim('No RSC permissions configured.'));
        return;
      }

      printPermissionsTable(permissions);
    })
  );

const rscAddCommand = new Command('add')
  .description('Add an RSC permission to an app')
  .argument('<teamsAppId>', 'Teams app ID')
  .argument('<permission>', 'RSC permission name (e.g. ChannelMessage.Read.Group)')
  .requiredOption('--type <type>', 'Permission type: Application or Delegated')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (teamsAppId: string, permission: string, options: RscAddOptions) => {
      if (options.type !== 'Application' && options.type !== 'Delegated') {
        throw new CliError(
          'VALIDATION_FORMAT',
          `Invalid type "${options.type}".`,
          'Use --type Application or --type Delegated.'
        );
      }

      const token = await requireToken();
      const entry: RscPermissionEntry = { name: permission, type: options.type };

      const spinner = createSilentSpinner('Adding RSC permission...', options.json).start();
      const { added, skipped } = await addRscPermissions(token, teamsAppId, [entry]);
      spinner.stop();

      if (options.json) {
        const result: RscAddOutput = { added, skipped };
        outputJson(result);
        return;
      }

      if (skipped.length > 0) {
        logger.info(pc.yellow(`Permission "${permission}" already exists.`));
      } else {
        logger.info(pc.green(`Added ${permission} (${options.type}).`));
      }
    })
  );

const rscRemoveCommand = new Command('remove')
  .description('Remove an RSC permission from an app')
  .argument('<teamsAppId>', 'Teams app ID')
  .argument('<permission>', 'RSC permission name (e.g. ChannelMessage.Read.Group)')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (teamsAppId: string, permission: string, options: RscRemoveOptions) => {
      const token = await requireToken();

      const spinner = createSilentSpinner('Removing RSC permission...', options.json).start();
      const { removed, notFound } = await removeRscPermissions(token, teamsAppId, [permission]);
      spinner.stop();

      if (options.json) {
        const result: RscRemoveOutput = { removed, notFound };
        outputJson(result);
        return;
      }

      if (notFound.length > 0) {
        throw new CliError(
          'VALIDATION_MISSING',
          `Permission "${permission}" not found on this app.`
        );
      }

      logger.info(pc.green(`Removed ${permission}.`));
    })
  );

interface RscSetOptions {
  permissions: string;
  json?: boolean;
}

interface RscSetOutput {
  added: RscPermissionEntry[];
  removed: RscPermissionEntry[];
  unchanged: RscPermissionEntry[];
}

const rscSetCommand = new Command('set')
  .description('Declaratively set RSC permissions to an exact list')
  .argument('<teamsAppId>', 'Teams app ID')
  .requiredOption(
    '--permissions <list>',
    'Comma-separated permission names (e.g. TeamSettings.ReadWrite.Group,ChannelMessage.Read.Group). Pass "" to clear all.'
  )
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (teamsAppId: string, options: RscSetOptions) => {
      // Parse comma-separated names and deduplicate. Empty string = clear all.
      const names = [
        ...new Set(
          options.permissions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        ),
      ];

      // Resolve each name to a typed entry via catalog
      const desired: RscPermissionEntry[] = [];
      const unrecognized: string[] = [];
      for (const name of names) {
        const found = findPermission(name);
        if (!found) {
          unrecognized.push(name);
        } else {
          desired.push({ name: found.name, type: found.type });
        }
      }

      if (unrecognized.length > 0) {
        throw new CliError(
          'VALIDATION_FORMAT',
          `Unrecognized permission(s): ${unrecognized.join(', ')}`,
          'Use `teams app rsc add` for permissions not in the catalog.'
        );
      }

      const token = await requireToken();

      const spinner = createSilentSpinner('Setting RSC permissions...', options.json).start();
      const current = await listRscPermissions(token, teamsAppId);

      // Guard against silently dropping non-catalog permissions
      const droppedNonCatalog = current.filter((p) => findPermission(p.name) === null);
      if (droppedNonCatalog.length > 0) {
        spinner.stop();
        const droppedNames = droppedNonCatalog.map((p) => p.name);
        throw new CliError(
          'VALIDATION_CONFLICT',
          `This app has non-catalog permissions that would be removed: ${droppedNames.join(', ')}`,
          'Remove them first with `teams app rsc remove`, then re-run this command. Use `add`/`remove` instead of `set` if you need to keep custom permissions.'
        );
      }

      const diff = diffRscPermissions(current, desired);

      if (diff.added.length === 0 && diff.removed.length === 0) {
        spinner.stop();
        if (options.json) {
          const result: RscSetOutput = { added: [], removed: [], unchanged: diff.unchanged };
          outputJson(result);
          return;
        }
        logger.info(pc.dim('No changes needed — permissions already match.'));
        return;
      }

      await setRscPermissions(token, teamsAppId, diff.final);
      spinner.stop();

      if (options.json) {
        const result: RscSetOutput = {
          added: diff.added,
          removed: diff.removed,
          unchanged: diff.unchanged,
        };
        outputJson(result);
        return;
      }

      const parts: string[] = [];
      if (diff.added.length > 0) parts.push(`added ${diff.added.length}`);
      if (diff.removed.length > 0) parts.push(`removed ${diff.removed.length}`);
      if (diff.unchanged.length > 0) parts.push(`unchanged ${diff.unchanged.length}`);
      logger.info(pc.green(`RSC permissions updated (${parts.join(', ')}).`));
    })
  );

export const rscCommand = new Command('rsc').description(
  'Manage RSC (Resource-Specific Consent) permissions'
);

rscCommand.addCommand(rscListCommand);
rscCommand.addCommand(rscAddCommand);
rscCommand.addCommand(rscRemoveCommand);
rscCommand.addCommand(rscSetCommand);
