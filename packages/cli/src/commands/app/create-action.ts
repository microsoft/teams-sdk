import {
  createAadAppViaTdp,
  createClientSecret,
  createManifestZip,
  getAadAppByClientId,
  importAppPackage,
  type ManifestOptions,
  createTdpBotHandler,
  createAzureBotHandler,
  type AzureContext,
  type BotLocation,
  type BotScope,
  installLink,
  portalLink,
} from '../../apps/index.js';
import { getAccount, getTokenSilent, graphScopes, teamsDevPortalScopes } from '../../auth/index.js';
import type { EnvValues } from '../../utils/env.js';
import { CliError } from '../../utils/errors.js';

export type AppCreateSignInAudience = 'AzureADMyOrg' | 'AzureADMultipleOrgs';

export interface AppCreateInput {
  name: string;
  endpoint: string | undefined;
  serviceManagementReference: string | undefined;
  signInAudience: AppCreateSignInAudience;
  generateSecret: boolean;
  botLocation: BotLocation;
  azureContext: AzureContext | undefined;
  description: { short: string; full?: string } | undefined;
  scopes: BotScope[] | undefined;
  developer:
    | {
        name: string;
        websiteUrl: string;
        privacyUrl: string;
        termsOfUseUrl: string;
      }
    | undefined;
  colorIconBuffer: Buffer | undefined;
  outlineIconBuffer: Buffer | undefined;
}

export interface AppCreateResult {
  appName: string;
  teamsAppId: string;
  botId: string;
  endpoint: string | null;
  installLink: string;
  portalLink: string;
  botLocation: 'teams-managed' | 'azure';
  secretSkipped: boolean;
  credentials: EnvValues;
}

export interface AppCreateProgress {
  start(message: string): void;
  success(message: string): void;
  error(message: string): void;
}

export async function createApp(
  input: AppCreateInput,
  progress?: AppCreateProgress
): Promise<AppCreateResult> {
  progress?.start('Acquiring tokens...');
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }

  let graphToken: string | null | undefined;
  if (input.generateSecret) {
    graphToken = await getTokenSilent(graphScopes);
    if (!graphToken) {
      progress?.error('Failed to get Graph token');
      throw new CliError(
        'AUTH_TOKEN_FAILED',
        'Failed to get Graph token.',
        'Try `teams login` again.'
      );
    }
  }

  const tdpToken = await getTokenSilent(teamsDevPortalScopes);
  if (!tdpToken) {
    progress?.error('Failed to get TDP token');
    throw new CliError(
      'AUTH_TOKEN_FAILED',
      'Failed to get TDP token.',
      'Try `teams login` again.'
    );
  }
  progress?.success('Tokens acquired');

  progress?.start('Creating Azure AD app...');
  const aadApp = await createAadAppViaTdp(tdpToken, input.name, {
    serviceManagementReference: input.serviceManagementReference,
    signInAudience: input.signInAudience,
  });
  const clientId = aadApp.appId;
  progress?.success(`Created Azure AD app (${clientId})`);

  const manifestOpts: ManifestOptions = {
    botId: clientId,
    botName: input.name,
    endpoint: input.endpoint,
    description: input.description,
    scopes: input.scopes,
    developer: input.developer,
    colorIconBuffer: input.colorIconBuffer,
    outlineIconBuffer: input.outlineIconBuffer,
  };
  const zipBuffer = createManifestZip(manifestOpts);

  let secretText: string | undefined;
  if (input.generateSecret) {
    progress?.start('Generating client secret...');
    let graphApp: { id: string } | null = null;
    let graphLookupError: unknown;
    for (let i = 0; i < 10; i++) {
      try {
        graphApp = await getAadAppByClientId(graphToken!, clientId);
        break;
      } catch (error) {
        graphLookupError = error;
        if (i < 9) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }
    if (!graphApp) {
      progress?.error('AAD app not available in Graph API');
      const lastError =
        graphLookupError instanceof Error ? ` Last error: ${graphLookupError.message}` : '';
      throw new CliError(
        'NOT_FOUND_AAD',
        `AAD app not yet available in Graph API.${lastError}`,
        'Try again shortly.'
      );
    }
    const secret = await createClientSecret(graphToken!, graphApp.id);
    secretText = secret.secretText;
    progress?.success('Generated client secret');
  }

  progress?.start('Creating Teams app...');
  const importedApp = await importAppPackage(tdpToken, zipBuffer);
  const teamsAppId = importedApp.teamsAppId;
  progress?.success(`Created Teams app (${teamsAppId})`);

  progress?.start('Registering bot...');
  const handler =
    input.botLocation === 'tm'
      ? createTdpBotHandler(tdpToken)
      : createAzureBotHandler(input.azureContext!);
  await handler.createBot({ botId: clientId, name: input.name, endpoint: input.endpoint });
  progress?.success('Bot registered');

  const credentials: EnvValues = {
    CLIENT_ID: clientId,
    ...(secretText !== undefined && { CLIENT_SECRET: secretText }),
    TENANT_ID: account.tenantId,
  };

  return {
    appName: input.name,
    teamsAppId,
    botId: clientId,
    endpoint: input.endpoint ?? null,
    installLink: installLink(teamsAppId, account.tenantId),
    portalLink: portalLink(teamsAppId),
    botLocation: input.botLocation === 'tm' ? 'teams-managed' : 'azure',
    secretSkipped: !input.generateSecret,
    credentials,
  };
}
