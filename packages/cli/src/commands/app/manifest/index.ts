import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import { fetchApp } from '../../../apps/index.js';
import { pickApp } from '../../../utils/app-picker.js';
import { isInteractive } from '../../../utils/interactive.js';
import { downloadManifest, uploadManifestFromFile } from './actions.js';
import { CliError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { manifestDownloadCommand } from './download.js';
import { manifestUploadCommand } from './upload.js';
import pc from 'picocolors';

export const appManifestCommand = new Command('manifest')
  .description('Download or upload app manifests')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    while (true) {
      try {
        const action = await select({
          message: 'Manifest',
          choices: [
            { name: 'Download', value: 'download' },
            { name: 'Upload', value: 'upload' },
            { name: 'Back', value: 'back' },
          ],
        });

        if (action === 'back') return;

        if (action === 'download') {
          const picked = await pickApp();
          const app = await fetchApp(picked.token, picked.app.teamsAppId);

          const savePath = await input({
            message: `${app.appName ?? 'Unnamed'} — save manifest to (leave empty to print):`,
            default: '',
          });

          try {
            await downloadManifest(picked.token, app.appId, savePath || undefined);
          } catch (error) {
            logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
            if (error instanceof CliError && error.suggestion) {
              logger.error(error.suggestion);
            }
          }
        }

        if (action === 'upload') {
          const picked = await pickApp();

          const filePath = await input({
            message: 'Path to manifest.json:',
          });

          if (!filePath) {
            logger.error(pc.red('No file path provided.'));
            continue;
          }

          try {
            await uploadManifestFromFile(picked.token, picked.app.teamsAppId, filePath);
          } catch (error) {
            logger.error(pc.red(error instanceof Error ? error.message : 'Unknown error'));
            if (error instanceof CliError && error.suggestion) {
              logger.error(error.suggestion);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
          return;
        }
        throw error;
      }
    }
  });

appManifestCommand.addCommand(manifestDownloadCommand);
appManifestCommand.addCommand(manifestUploadCommand);
