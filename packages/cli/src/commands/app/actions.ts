import { select, input } from '@inquirer/prompts';
import pc from 'picocolors';
import { writeFile } from 'node:fs/promises';
import { createSilentSpinner } from '../../utils/spinner.js';
import { showUpdateMenu } from './update.js';
import { fetchAppDetail, showAppDetail, downloadAppPackage, installLink, portalLink } from '../../apps/index.js';
import { getAccount } from '../../auth/index.js';
import { logger } from '../../utils/logger.js';
import { downloadManifest } from './manifest/actions.js';
import { authCommand } from './auth/index.js';
import { appDoctorCommand } from './doctor.js';
import { showRscMenu } from './rsc/index.js';
import type { AppSummary } from '../../apps/types.js';

/**
 * Show an action submenu for a specific app.
 * Returns when user selects "Back".
 */
export async function showAppActions(app: AppSummary, token: string): Promise<void> {
  while (true) {
    const action = await select({
      message: `${app.appName ?? 'Unnamed'}:`,
      choices: [
        { name: 'Get app details', value: 'get' },
        { name: 'Update app', value: 'update' },
        { name: 'Download package', value: 'package' },
        { name: 'Download manifest', value: 'manifest' },
        { name: 'Auth (secrets)', value: 'credentials' },
        { name: 'Permissions (RSC)', value: 'rsc' },
        { name: 'Doctor (diagnostics)', value: 'doctor' },
        { name: 'Back', value: 'back' },
      ],
    });

    if (action === 'back') return;

    if (action === 'get') {
      const account = await getAccount();
      const { appDetails, endpoint } = await fetchAppDetail(app, token);
      const tenantId = account?.tenantId ?? '';
      await showAppDetail({
        appDetails,
        endpoint,
        installLink: installLink(appDetails.teamsAppId, tenantId),
        portalLink: portalLink(appDetails.teamsAppId),
      }, { interactive: true });
    } else if (action === 'update') {
      await showUpdateMenu(app, token);
    } else if (action === 'package') {
      const outputPath = `${(app.appName || app.appId).replace(/\s+/g, '-')}.zip`;
      const spinner = createSilentSpinner('Downloading package...').start();
      const packageBuffer = await downloadAppPackage(token, app.appId);
      spinner.stop();
      await writeFile(outputPath, packageBuffer);
      logger.info(pc.green(`Package saved to ${outputPath}`));
    } else if (action === 'manifest') {
      const savePath = await input({
        message: `${app.appName ?? 'Unnamed'} — save manifest to (leave empty to print):`,
        default: '',
      });
      try {
        await downloadManifest(token, app.appId, savePath || undefined);
      } catch (error) {
        logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
      }
    } else if (action === 'credentials') {
      try {
        await authCommand.parseAsync(['secret', 'create', app.teamsAppId], { from: 'user' });
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') continue;
        logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
      }
    } else if (action === 'rsc') {
      try {
        await showRscMenu(app, token);
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') continue;
        logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
      }
    } else if (action === 'doctor') {
      try {
        await appDoctorCommand.parseAsync([app.teamsAppId], { from: 'user' });
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') continue;
        logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  }
}
