import { input } from '@inquirer/prompts';
import { createClientSecret, fetchApp, getAadAppByClientId } from '../../../../apps/index.js';
import { confirmAction } from '../../../../utils/interactive.js';
import { getAccount, getTokenSilent, graphScopes } from '../../../../auth/index.js';
import { isJsonFile, outputCredentials, writeEnvFile, writeJsonCredentials } from '../../../../utils/env.js';
import { CliError } from '../../../../utils/errors.js';
import { outputJson } from '../../../../utils/json-output.js';
import { createSilentSpinner } from '../../../../utils/spinner.js';

interface SecretGenerateOutput {
  botId: string;
  aadAppName: string;
  credentials?: {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    TENANT_ID: string;
  };
  credentialsFile?: string;
}

interface GenerateSecretOptions {
  /** TDP auth token */
  tdpToken: string;
  /** Teams app ID */
  appId: string;
  /** Explicit credentials file path, e.g. .env or appsettings.json (skips prompt) */
  envPath?: string;
  /** When true, prompt for credentials file path if not provided */
  interactive?: boolean;
  /** When true, output JSON instead of human-readable text */
  json?: boolean;
}

/**
 * Core secret generation logic. Acquires graph token, looks up bot/AAD app,
 * creates secret, and outputs credentials.
 *
 * Throws on failure. Caller decides how to handle errors.
 */
export async function generateSecret(opts: GenerateSecretOptions): Promise<void> {
  const silent = !!opts.json;
  let envPath = opts.envPath;

  if (envPath === undefined && opts.interactive) {
    envPath =
      (await input({
        message: 'Path to credentials file, e.g. .env or appsettings.json (leave empty to show in terminal):',
      })) || undefined;
  }

  if (!(await confirmAction('Generate a new client secret?', silent))) {
    return;
  }

  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }

  let spinner = createSilentSpinner('Acquiring Graph token...', silent).start();
  const graphToken = await getTokenSilent(graphScopes);
  if (!graphToken) {
    spinner.error({ text: 'Failed to get Graph token' });
    throw new CliError(
      'AUTH_TOKEN_FAILED',
      'Failed to get Graph token.',
      'Try `teams login` again.'
    );
  }
  spinner.success({ text: 'Graph token acquired' });

  spinner = createSilentSpinner('Fetching app details...', silent).start();
  const app = await fetchApp(opts.tdpToken, opts.appId);

  if (!app.bots || app.bots.length === 0) {
    spinner.error({ text: 'This app has no bots' });
    throw new CliError('NOT_FOUND_BOT', 'This app has no bots.');
  }

  const clientId = app.bots[0].botId;
  spinner.success({ text: `Found bot (${clientId})` });

  spinner = createSilentSpinner('Looking up AAD app...', silent).start();
  const aadApp = await getAadAppByClientId(graphToken, clientId);
  spinner.success({ text: `Found AAD app (${aadApp.displayName})` });

  spinner = createSilentSpinner('Generating client secret...', silent).start();
  const secret = await createClientSecret(graphToken, aadApp.id);
  spinner.success({ text: 'Generated client secret' });

  if (opts.json) {
    const credentialValues = {
      CLIENT_ID: clientId,
      CLIENT_SECRET: secret.secretText,
      TENANT_ID: account.tenantId,
    };

    if (envPath) {
      if (isJsonFile(envPath)) {
        writeJsonCredentials(envPath, credentialValues);
      } else {
        writeEnvFile(envPath, credentialValues);
      }
    }

    const result: SecretGenerateOutput = {
      botId: clientId,
      aadAppName: aadApp.displayName,
      ...(envPath
        ? { credentialsFile: envPath }
        : { credentials: credentialValues }),
    };
    outputJson(result);
  } else {
    outputCredentials(
      envPath,
      {
        CLIENT_ID: clientId,
        CLIENT_SECRET: secret.secretText,
        TENANT_ID: account.tenantId,
      },
      'Secret generated successfully!'
    );
  }
}
