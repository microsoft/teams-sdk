import {
  PublicClientApplication,
  AccountInfo,
  DeviceCodeRequest,
  InteractiveRequest,
  AuthenticationResult,
} from '@azure/msal-node';
import { msalConfig, loginScopes } from './config.js';
import { createCachePlugin } from './cache.js';
import { logger } from '../utils/logger.js';
import { openInBrowser } from '../utils/browser.js';
import { isInteractive, isLocalSession } from '../utils/interactive.js';

let msalClient: PublicClientApplication | null = null;

export async function getMsalClient(): Promise<PublicClientApplication> {
  if (msalClient) {
    return msalClient;
  }

  const cachePlugin = await createCachePlugin();
  const config = {
    ...msalConfig,
    ...(cachePlugin ? { cache: { cachePlugin } } : {}),
  };

  msalClient = new PublicClientApplication(config);
  return msalClient;
}

export async function getAccount(): Promise<AccountInfo | null> {
  const client = await getMsalClient();
  const cache = client.getTokenCache();
  const accounts = await cache.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

const SUCCESS_TEMPLATE =
  '<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to the CLI.</p></body></html>';
const ERROR_TEMPLATE =
  '<html><body><h2>Authentication failed</h2><p>Something went wrong. Please try again.</p></body></html>';

export async function login(): Promise<AccountInfo> {
  const client = await getMsalClient();

  const result =
    isInteractive() && isLocalSession()
      ? await loginInteractive(client)
      : await loginDeviceCode(client);

  if (!result?.account) {
    throw new Error('Login failed: no account returned');
  }

  return result.account;
}

async function loginInteractive(client: PublicClientApplication): Promise<AuthenticationResult> {
  const request: InteractiveRequest = {
    scopes: loginScopes,
    openBrowser: async (url) => {
      await openInBrowser(url);
    },
    successTemplate: SUCCESS_TEMPLATE,
    errorTemplate: ERROR_TEMPLATE,
  };

  return client.acquireTokenInteractive(request);
}

async function loginDeviceCode(
  client: PublicClientApplication
): Promise<AuthenticationResult | null> {
  const request: DeviceCodeRequest = {
    scopes: loginScopes,
    deviceCodeCallback: (response) => {
      logger.info(response.message);
    },
  };

  return client.acquireTokenByDeviceCode(request);
}

export async function logout(): Promise<void> {
  const client = await getMsalClient();
  const cache = client.getTokenCache();
  const accounts = await cache.getAllAccounts();

  for (const account of accounts) {
    await cache.removeAccount(account);
  }
}

export async function getTokenSilent(scopes: string[]): Promise<string | null> {
  const client = await getMsalClient();
  const account = await getAccount();

  if (!account) {
    return null;
  }

  try {
    const result = await client.acquireTokenSilent({
      scopes,
      account,
    });
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}
