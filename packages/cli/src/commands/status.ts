import { Command } from 'commander';
import { createSilentSpinner } from '../utils/spinner.js';
import pc from 'picocolors';
import { type AccountInfo } from '@azure/msal-node';
import { getAccount, getTokenSilent, paths, teamsDevPortalScopes } from '../auth/index.js';
import { isAzInstalled, isAzLoggedIn, runAz } from '../utils/az.js';
import { wrapAction } from '../utils/errors.js';
import { isInteractive } from '../utils/interactive.js';
import { isVerbose, logger } from '../utils/logger.js';
import { outputJson } from '../utils/json-output.js';
import { fetchTenantSettings, fetchUserAppPolicy } from '../apps/api.js';

interface StatusOptions {
  json?: boolean;
}

interface StatusOutput {
  loggedIn: boolean;
  username: string | null;
  tenantId: string | null;
  userObjectId: string | null;
  tdp: EnvironmentCheckResult['tdp'];
  azureCli: EnvironmentCheckResult['azureCli'];
}

export interface EnvironmentCheckResult {
  tdp: {
    connected: boolean;
    sideloading: {
      tenant: boolean | null;
      user: boolean | null;
    };
  } | null;
  azureCli: {
    installed: boolean;
    loggedIn: boolean;
    subscription: { name: string; id: string } | null;
    tenantId: string | null;
    tenantMatch: boolean | null;
  };
}

/**
 * Check TDP sideloading and Azure CLI status, display results unless silent.
 * Used by both the `status` command and post-login flow.
 */
export async function checkAndDisplayEnvironment(
  account: AccountInfo,
  silent = false
): Promise<EnvironmentCheckResult> {
  const muteSpinners = silent || !isInteractive();
  const tenantId = account.tenantId;
  const result: EnvironmentCheckResult = {
    tdp: null,
    azureCli: { installed: false, loggedIn: false, subscription: null, tenantId: null, tenantMatch: null },
  };

  // ── TDP / sideloading ─────────────────────────────────────────────
  const tdpSpinner = createSilentSpinner('Checking sideloading status...', muteSpinners).start();
  const tdpToken = await getTokenSilent(teamsDevPortalScopes);

  if (!tdpToken) {
    result.tdp = { connected: false, sideloading: { tenant: null, user: null } };
    const text = `TDP: ${pc.yellow('not connected')} ${pc.dim('(token unavailable)')}`;
    tdpSpinner.warn({ text });
    if (!silent && muteSpinners) logger.info(`${pc.yellow('⚠')} ${text}`);
  } else {
    result.tdp = { connected: true, sideloading: { tenant: null, user: null } };

    try {
      const [tenantSettings, userPolicy] = await Promise.all([
        fetchTenantSettings(tdpToken),
        fetchUserAppPolicy(tdpToken),
      ]);

      const tenantEnabled = tenantSettings.isSideLoadingInteractionEnabled ?? false;
      const userAllowed = userPolicy.value?.isSideloadingAllowed ?? false;

      result.tdp.sideloading.tenant = tenantEnabled;
      result.tdp.sideloading.user = userAllowed;

      if (tenantEnabled && userAllowed) {
        const text = `Sideloading: ${pc.green('enabled')}`;
        tdpSpinner.success({ text });
        if (!silent && muteSpinners) logger.info(`${pc.green('✔')} ${text}`);
      } else if (!tenantEnabled && userAllowed) {
        const text = `Sideloading: ${pc.yellow('disabled at tenant level')}`;
        tdpSpinner.warn({ text });
        if (!silent && muteSpinners) logger.info(`${pc.yellow('⚠')} ${text}`);
        if (!silent) {
          logger.info(
            `  ${pc.dim('Your user policy allows sideloading, but the tenant-wide setting is off.')}`
          );
          logger.info(`  ${pc.dim('Ask your admin to enable it in Teams Admin Center →')}`);
          logger.info(
            `  ${pc.dim('Org-wide app settings → Custom apps → "Allow interaction with custom apps"')}`
          );
        }
      } else if (tenantEnabled && !userAllowed) {
        const text = `Sideloading: ${pc.yellow('not allowed for your account')}`;
        tdpSpinner.warn({ text });
        if (!silent && muteSpinners) logger.info(`${pc.yellow('⚠')} ${text}`);
        if (!silent) {
          logger.info(
            `  ${pc.dim('Sideloading is enabled for the tenant, but your user policy blocks it.')}`
          );
          logger.info(`  ${pc.dim('Ask your admin to enable it in Teams Admin Center →')}`);
          logger.info(
            `  ${pc.dim('Users → Find the user → Policies → App setup policy → "Upload custom apps"')}`
          );
        }
      } else {
        const text = `Sideloading: ${pc.yellow('disabled')}`;
        tdpSpinner.warn({ text });
        if (!silent && muteSpinners) logger.info(`${pc.yellow('⚠')} ${text}`);
        if (!silent) {
          logger.info(
            `  ${pc.dim('Neither the tenant nor your user policy allows sideloading.')}`
          );
          logger.info(`  ${pc.dim('Ask your admin to enable it in Teams Admin Center →')}`);
          logger.info(
            `  ${pc.dim('Org-wide app settings → Custom apps → "Allow interaction with custom apps"')}`
          );
        }
      }
    } catch {
      const text = `Sideloading: ${pc.yellow('could not determine')}`;
      tdpSpinner.warn({ text });
      if (!silent && muteSpinners) logger.info(`${pc.yellow('⚠')} ${text}`);
    }
  }

  // ── Azure CLI ─────────────────────────────────────────────────────
  const azInstalled = await isAzInstalled();
  result.azureCli.installed = azInstalled;

  if (!azInstalled) {
    if (!silent) logger.info(`\n${pc.dim('Azure CLI:')} ${pc.yellow('not installed')}`);
  } else {
    const azLoggedIn = await isAzLoggedIn();
    result.azureCli.loggedIn = azLoggedIn;

    if (!azLoggedIn) {
      if (!silent)
        logger.info(`\n${pc.dim('Azure CLI:')} installed, ${pc.yellow('not logged in')}`);
    } else {
      try {
        const sub = await runAz<{ name: string; id: string; tenantId: string }>(['account', 'show']);
        result.azureCli.subscription = { name: sub.name, id: sub.id };
        result.azureCli.tenantId = sub.tenantId;
        result.azureCli.tenantMatch = tenantId ? tenantId === sub.tenantId : null;
        if (!silent) {
          logger.info(`\n${pc.dim('Azure CLI:')} ${pc.green('connected')}`);
          logger.info(`${pc.dim('Subscription:')} ${sub.name} ${pc.dim(`(${sub.id})`)}`);
          if (tenantId && sub.tenantId) {
            if (tenantId === sub.tenantId) {
              logger.info(`${pc.dim('Tenant:')} ${pc.green('matches Teams login')}`);
            } else {
              logger.info(`${pc.dim('Tenant:')} ${pc.red('mismatch')}`);
              logger.info(`  ${pc.dim('Teams login:')} ${tenantId}`);
              logger.info(`  ${pc.dim('Azure CLI:')}   ${sub.tenantId}`);
              logger.info(`  ${pc.dim('Run')} ${pc.cyan(`az login --tenant ${tenantId}`)} ${pc.dim('to align.')}`);
            }
          }
        }
      } catch {
        if (!silent)
          logger.info(`\n${pc.dim('Azure CLI:')} installed, ${pc.yellow('status unknown')}`);
      }
    }
  }

  return result;
}

export const statusCommand = new Command('status')
  .description('Show current CLI status')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options: StatusOptions) => {
      const silent = !!options.json;
      const account = await getAccount();

      const output: StatusOutput = {
        loggedIn: false,
        username: null,
        tenantId: null,
        userObjectId: null,
        tdp: null,
        azureCli: { installed: false, loggedIn: false, subscription: null, tenantId: null, tenantMatch: null },
      };

      if (!account) {
        if (!silent) {
          logger.info(`${pc.yellow('⚠')} Not logged in`);
          logger.info(`  Run ${pc.cyan('teams login')} to authenticate.`);
        }
        if (options.json) outputJson(output);
        return;
      }

      output.loggedIn = true;
      output.username = account.username;
      output.tenantId = account.tenantId;
      output.userObjectId = account.localAccountId;

      if (!silent) {
        logger.info(`${pc.green('✔')} Logged in as ${pc.bold(account.username)}`);

        if (isVerbose()) {
          logger.info(`  ${pc.dim('Tenant ID:')} ${account.tenantId}`);
          logger.info(`  ${pc.dim('User Object ID:')} ${account.localAccountId}`);
          logger.info(`  ${pc.dim('Config path:')} ${paths.config}`);
        }
      }

      const envResult = await checkAndDisplayEnvironment(account, silent);
      output.tdp = envResult.tdp;
      output.azureCli = envResult.azureCli;

      if (options.json) outputJson(output);
    })
  );
