import { Command } from 'commander';
import { createSilentSpinner } from '../utils/spinner.js';
import pc from 'picocolors';
import { getAccount, getTokenSilent, paths, teamsDevPortalScopes } from '../auth/index.js';
import { isAzInstalled, isAzLoggedIn, runAz } from '../utils/az.js';
import { wrapAction } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { outputJson } from '../utils/json-output.js';
import { fetchTenantSettings, fetchUserAppPolicy } from '../apps/api.js';

interface StatusOptions {
  verbose?: boolean;
  json?: boolean;
}

interface StatusOutput {
  loggedIn: boolean;
  username: string | null;
  tenantId: string | null;
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

export const statusCommand = new Command('status')
  .description('Show current CLI status')
  .option('-v, --verbose', '[OPTIONAL] Show additional details')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (options: StatusOptions) => {
      const silent = !!options.json;
      const account = await getAccount();

      const output: StatusOutput = {
        loggedIn: false,
        username: null,
        tenantId: null,
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

      if (!silent) {
        logger.info(`${pc.green('✔')} Logged in as ${pc.bold(account.username)}`);

        if (options.verbose) {
          logger.info(`  ${pc.dim('Tenant ID:')} ${account.tenantId}`);
          logger.info(`  ${pc.dim('Home Account ID:')} ${account.homeAccountId}`);
          logger.info(`  ${pc.dim('Config path:')} ${paths.config}`);
        }
      }

      // ── TDP / sideloading ─────────────────────────────────────────────
      const tdpSpinner = createSilentSpinner('Checking sideloading status...', silent).start();
      const tdpToken = await getTokenSilent(teamsDevPortalScopes);

      if (!tdpToken) {
        output.tdp = { connected: false, sideloading: { tenant: null, user: null } };
        tdpSpinner.warn({
          text: `TDP: ${pc.yellow('not connected')} ${pc.dim('(token unavailable)')}`,
        });
      } else {
        output.tdp = { connected: true, sideloading: { tenant: null, user: null } };

        try {
          const [tenantSettings, userPolicy] = await Promise.all([
            fetchTenantSettings(tdpToken),
            fetchUserAppPolicy(tdpToken),
          ]);

          const tenantEnabled = tenantSettings.isSideLoadingInteractionEnabled ?? false;
          const userAllowed = userPolicy.value?.isSideloadingAllowed ?? false;

          output.tdp.sideloading.tenant = tenantEnabled;
          output.tdp.sideloading.user = userAllowed;

          if (tenantEnabled && userAllowed) {
            tdpSpinner.success({ text: `Sideloading: ${pc.green('enabled')}` });
          } else if (!tenantEnabled && userAllowed) {
            tdpSpinner.warn({ text: `Sideloading: ${pc.yellow('disabled at tenant level')}` });
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
            tdpSpinner.warn({ text: `Sideloading: ${pc.yellow('not allowed for your account')}` });
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
            tdpSpinner.warn({ text: `Sideloading: ${pc.yellow('disabled')}` });
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
          tdpSpinner.warn({ text: `Sideloading: ${pc.yellow('could not determine')}` });
        }
      }

      // ── Azure CLI ─────────────────────────────────────────────────────
      const azInstalled = await isAzInstalled();
      output.azureCli.installed = azInstalled;

      if (!azInstalled) {
        if (!silent) logger.info(`\n${pc.dim('Azure CLI:')} ${pc.yellow('not installed')}`);
      } else {
        const azLoggedIn = await isAzLoggedIn();
        output.azureCli.loggedIn = azLoggedIn;

        if (!azLoggedIn) {
          if (!silent)
            logger.info(`\n${pc.dim('Azure CLI:')} installed, ${pc.yellow('not logged in')}`);
        } else {
          try {
            const sub = await runAz<{ name: string; id: string; tenantId: string }>(['account', 'show']);
            output.azureCli.subscription = { name: sub.name, id: sub.id };
            output.azureCli.tenantId = sub.tenantId;
            output.azureCli.tenantMatch = output.tenantId ? output.tenantId === sub.tenantId : null;
            if (!silent) {
              logger.info(`\n${pc.dim('Azure CLI:')} ${pc.green('connected')}`);
              logger.info(`${pc.dim('Subscription:')} ${sub.name} ${pc.dim(`(${sub.id})`)}`);
              if (output.tenantId && sub.tenantId) {
                if (output.tenantId === sub.tenantId) {
                  logger.info(`${pc.dim('Tenant:')} ${pc.green('matches Teams login')}`);
                } else {
                  logger.info(`${pc.dim('Tenant:')} ${pc.red('mismatch')}`);
                  logger.info(`  ${pc.dim('Teams login:')} ${output.tenantId}`);
                  logger.info(`  ${pc.dim('Azure CLI:')}   ${sub.tenantId}`);
                  logger.info(`  ${pc.dim('Run')} ${pc.cyan(`az login --tenant ${output.tenantId}`)} ${pc.dim('to align.')}`);
                }
              }
            }
          } catch {
            if (!silent)
              logger.info(`\n${pc.dim('Azure CLI:')} installed, ${pc.yellow('status unknown')}`);
          }
        }
      }

      if (options.json) outputJson(output);
    })
  );
