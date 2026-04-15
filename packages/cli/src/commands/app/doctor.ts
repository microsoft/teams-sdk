import { Command } from 'commander';
import pc from 'picocolors';
import { getAccount, getTokenSilent, teamsDevPortalScopes, graphScopes } from '../../auth/index.js';
import {
  fetchAppDetailsV2,
  getAadAppByClientId,
  getAadAppFull,
  fetchBot,
  getBotLocation,
  discoverAzureBot,
  extractDomain,
} from '../../apps/index.js';
import type { AppDetails } from '../../apps/types.js';
import type { BotDetails } from '../../apps/tdp.js';
import type { BotLocation } from '../../apps/bot-location.js';
import type { AzureContext } from '../../apps/bot-handler.js';
import { isAzInstalled, isAzLoggedIn, runAz } from '../../utils/az.js';
import { CliError, wrapAction } from '../../utils/errors.js';
import { outputJson } from '../../utils/json-output.js';
import { pickApp } from '../../utils/app-picker.js';
import { logger } from '../../utils/logger.js';
import { createSilentSpinner } from '../../utils/spinner.js';

type CheckStatus = 'pass' | 'fail' | 'warn' | 'info';

interface CheckResult {
  category: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

interface DoctorOutput {
  appId: string;
  appName: string;
  checks: Array<{
    category: string;
    label: string;
    status: CheckStatus;
    detail?: string;
  }>;
  summary: {
    total: number;
    pass: number;
    fail: number;
    warn: number;
    info: number;
  };
}

const STATUS_ICONS: Record<CheckStatus, string> = {
  pass: pc.green('✔'),
  fail: pc.red('✗'),
  warn: pc.yellow('⚠'),
  info: pc.blue('ℹ'),
};

function printResults(results: CheckResult[]): void {
  for (const r of results) {
    const icon = STATUS_ICONS[r.status];
    const detail = r.detail ? ` ${pc.dim(`(${r.detail})`)}` : '';
    logger.info(`  ${icon} ${r.label}${detail}`);
  }
}

function printSummary(allResults: CheckResult[]): void {
  const issues = allResults.filter((r) => r.status === 'fail').length;
  const warnings = allResults.filter((r) => r.status === 'warn').length;

  logger.info();
  if (issues === 0 && warnings === 0) {
    logger.info(pc.green('No issues found.'));
  } else {
    const parts: string[] = [];
    if (issues > 0) parts.push(pc.red(`${issues} issue${issues > 1 ? 's' : ''}`));
    if (warnings > 0) parts.push(pc.yellow(`${warnings} warning${warnings > 1 ? 's' : ''}`));
    logger.info(`${parts.join(', ')} found.`);
  }
}

async function checkEndpointReachable(endpoint: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    // Any response (even 4xx) means endpoint is reachable
    return response.status < 500;
  } catch {
    // Try GET as fallback (some servers reject HEAD)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      return response.status < 500;
    } catch {
      return false;
    }
  }
}

// --- Bot Registration checks ---

async function checkBotRegistration(
  results: CheckResult[],
  details: AppDetails,
  tdpToken: string,
  silent = false
): Promise<{
  botId: string;
  location: BotLocation;
  tmBot: BotDetails | null;
  azure: AzureContext | null;
} | null> {
  const cat = 'Bot Registration';

  if (!details.bots || details.bots.length === 0) {
    results.push({ category: cat, label: 'No bot registered', status: 'info' });
    return null;
  }

  const botId = details.bots[0].botId;
  results.push({ category: cat, label: 'Bot registered', status: 'pass', detail: botId });

  // Detect location
  let location: BotLocation;
  try {
    location = await getBotLocation(tdpToken, botId);
    results.push({
      category: cat,
      label: `Bot location: ${location === 'tm' ? 'Teams (managed)' : 'Azure'}`,
      status: 'pass',
    });
  } catch (e) {
    results.push({
      category: cat,
      label: 'Could not detect bot location',
      status: 'fail',
      detail: e instanceof Error ? e.message : undefined,
    });
    return null;
  }

  let tmBot: BotDetails | null = null;
  let azure: AzureContext | null = null;

  if (location === 'tm') {
    // Teams-managed specific checks
    try {
      tmBot = await fetchBot(tdpToken, botId);
      results.push({ category: cat, label: 'Bot details fetchable', status: 'pass' });

      // Teams channel
      if (tmBot.configuredChannels?.includes('msteams')) {
        results.push({ category: cat, label: 'Teams channel enabled', status: 'pass' });
      } else {
        results.push({
          category: cat,
          label: 'Teams channel not enabled',
          status: 'fail',
          detail: 'Add msteams to configuredChannels',
        });
      }

      // Endpoint
      if (tmBot.messagingEndpoint) {
        results.push({
          category: cat,
          label: `Endpoint: ${tmBot.messagingEndpoint}`,
          status: 'pass',
        });
        const reachable = await checkEndpointReachable(tmBot.messagingEndpoint);
        if (reachable) {
          results.push({ category: cat, label: 'Endpoint reachable', status: 'pass' });
        } else {
          results.push({
            category: cat,
            label: 'Endpoint unreachable',
            status: 'warn',
            detail: 'timeout or network error',
          });
        }
      } else {
        results.push({ category: cat, label: 'Messaging endpoint not set', status: 'warn' });
      }
    } catch (e) {
      results.push({
        category: cat,
        label: 'Could not fetch bot details',
        status: 'fail',
        detail: e instanceof Error ? e.message : undefined,
      });
    }
  } else {
    // Azure-specific checks
    if (!(await isAzInstalled())) {
      results.push({
        category: cat,
        label: 'Azure CLI not installed',
        status: 'warn',
        detail: 'Install from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli',
      });
    } else if (!(await isAzLoggedIn())) {
      results.push({
        category: cat,
        label: 'Azure CLI not logged in',
        status: 'warn',
        detail: 'Run az login',
      });
    } else {
      azure = await discoverAzureBot(botId, silent);
      if (azure) {
        results.push({
          category: cat,
          label: 'Azure bot discoverable',
          status: 'pass',
          detail: azure.resourceGroup,
        });

        // Check Teams channel + endpoint via az bot show
        try {
          const azBot = await runAz<{ properties?: { endpoint?: string } }>([
            'bot',
            'show',
            '--name',
            botId,
            '--resource-group',
            azure.resourceGroup,
            '--subscription',
            azure.subscription,
          ]);

          // Check Teams channel
          try {
            await runAz([
              'bot',
              'msteams',
              'show',
              '--name',
              botId,
              '--resource-group',
              azure.resourceGroup,
              '--subscription',
              azure.subscription,
            ]);
            results.push({ category: cat, label: 'Teams channel enabled', status: 'pass' });
          } catch {
            results.push({
              category: cat,
              label: 'Teams channel not enabled',
              status: 'fail',
              detail: 'Run: az bot msteams create',
            });
          }

          // Endpoint
          const endpoint = azBot?.properties?.endpoint;
          if (endpoint) {
            results.push({ category: cat, label: `Endpoint: ${endpoint}`, status: 'pass' });
            const reachable = await checkEndpointReachable(endpoint);
            if (reachable) {
              results.push({ category: cat, label: 'Endpoint reachable', status: 'pass' });
            } else {
              results.push({
                category: cat,
                label: 'Endpoint unreachable',
                status: 'warn',
                detail: 'timeout or network error',
              });
            }
          } else {
            results.push({ category: cat, label: 'Messaging endpoint not set', status: 'warn' });
          }
        } catch (e) {
          results.push({
            category: cat,
            label: 'Could not fetch Azure bot details',
            status: 'fail',
            detail: e instanceof Error ? e.message : undefined,
          });
        }
      } else {
        results.push({
          category: cat,
          label: 'Azure bot not found',
          status: 'fail',
          detail: 'Bot not discoverable via az resource list',
        });
      }
    }
  }

  return { botId, location, tmBot, azure };
}

// --- AAD App checks ---

async function checkAadApp(
  results: CheckResult[],
  botId: string,
  graphToken: string
): Promise<Record<string, unknown> | null> {
  const cat = 'AAD App';

  let aadApp;
  try {
    aadApp = await getAadAppByClientId(graphToken, botId);
    results.push({ category: cat, label: `AAD app found`, status: 'pass', detail: aadApp.appId });
  } catch {
    results.push({
      category: cat,
      label: 'AAD app not found',
      status: 'fail',
      detail: `No app with clientId ${botId}`,
    });
    return null;
  }

  // Get full details for password + audience checks
  let fullApp: Record<string, unknown>;
  try {
    fullApp = await getAadAppFull(graphToken, aadApp.id);
  } catch (e) {
    results.push({
      category: cat,
      label: 'Could not fetch full AAD app details',
      status: 'warn',
      detail: e instanceof Error ? e.message : undefined,
    });
    return null;
  }

  // Check secrets
  const creds = (fullApp.passwordCredentials ?? []) as Array<{
    endDateTime?: string;
    displayName?: string;
  }>;
  if (creds.length === 0) {
    results.push({
      category: cat,
      label: 'No client secrets',
      status: 'warn',
      detail: 'Run: teams app auth secret generate',
    });
  } else {
    const now = new Date();
    const active = creds.filter((c) => !c.endDateTime || new Date(c.endDateTime) > now);
    const expired = creds.length - active.length;

    if (active.length > 0) {
      const nearest = active
        .filter((c) => c.endDateTime)
        .sort((a, b) => new Date(a.endDateTime!).getTime() - new Date(b.endDateTime!).getTime());
      const expiryInfo =
        nearest.length > 0
          ? `nearest expiry: ${new Date(nearest[0].endDateTime!).toLocaleDateString()}`
          : 'no expiry';
      results.push({
        category: cat,
        label: `${active.length} active secret${active.length > 1 ? 's' : ''}`,
        status: 'pass',
        detail: expiryInfo,
      });
    }

    if (expired > 0) {
      results.push({
        category: cat,
        label: `${expired} expired secret${expired > 1 ? 's' : ''}`,
        status: active.length === 0 ? 'fail' : 'warn',
      });
    }
  }

  // Sign-in audience
  const audience = fullApp.signInAudience as string | undefined;
  if (audience) {
    results.push({ category: cat, label: `Sign-in audience: ${audience}`, status: 'info' });
  }

  return fullApp;
}

// --- Manifest checks ---

function checkManifest(
  results: CheckResult[],
  details: AppDetails,
  botId: string,
  endpoint?: string
): void {
  const cat = 'Manifest';

  // botId matches appId
  if (details.appId === botId) {
    results.push({ category: cat, label: 'Bot ID matches app ID', status: 'pass' });
  } else {
    results.push({
      category: cat,
      label: 'Bot ID does not match app ID',
      status: 'warn',
      detail: `appId=${details.appId}, botId=${botId}`,
    });
  }

  const validDomains = details.validDomains ?? [];

  // validDomains includes endpoint domain
  if (endpoint) {
    const domain = extractDomain(endpoint);
    if (domain && validDomains.includes(domain)) {
      results.push({ category: cat, label: 'Endpoint domain in validDomains', status: 'pass' });
    } else if (domain) {
      results.push({
        category: cat,
        label: 'Endpoint domain not in validDomains',
        status: 'warn',
        detail: `Add ${domain}`,
      });
    }
  }

  // *.botframework.com in validDomains (required for auth popups)
  if (validDomains.includes('*.botframework.com')) {
    results.push({ category: cat, label: '*.botframework.com in validDomains', status: 'pass' });
  } else {
    results.push({
      category: cat,
      label: '*.botframework.com missing from validDomains',
      status: 'warn',
      detail: 'Required for auth sign-in popups',
    });
  }

  // webApplicationInfo
  const wai = details.webApplicationInfoId;
  if (wai) {
    results.push({ category: cat, label: 'webApplicationInfo configured', status: 'pass' });

    // Check resource URI format
    const resource = details.webApplicationInfoResource;
    if (resource) {
      const expected = `api://botid-${botId}`;
      if (resource.startsWith(expected)) {
        results.push({ category: cat, label: `Resource URI: ${resource}`, status: 'pass' });
      } else {
        results.push({
          category: cat,
          label: `Resource URI format`,
          status: 'warn',
          detail: `Expected ${expected}, got ${resource}`,
        });
      }
    }
  } else {
    const hasRsc = (details.authorization?.permissions?.resourceSpecific ?? []).length > 0;
    if (hasRsc) {
      results.push({
        category: cat,
        label: 'webApplicationInfo not configured',
        status: 'fail',
        detail: 'Required when RSC permissions are present',
      });
    } else {
      results.push({
        category: cat,
        label: 'webApplicationInfo not configured',
        status: 'info',
        detail: 'SSO not set up',
      });
    }
  }
}

// --- SSO checks ---

async function checkSso(
  results: CheckResult[],
  details: AppDetails,
  botId: string,
  fullAadApp: Record<string, unknown>,
  azure: AzureContext | null
): Promise<void> {
  const cat = 'SSO';

  // Identifier URI
  const identifierUris = (fullAadApp.identifierUris ?? []) as string[];
  const expectedUri = `api://botid-${botId}`;
  const hasCorrectUri = identifierUris.some((u) => u.startsWith(expectedUri));

  if (hasCorrectUri) {
    results.push({ category: cat, label: `Identifier URI: ${expectedUri}`, status: 'pass' });
  } else if (identifierUris.length > 0) {
    results.push({
      category: cat,
      label: 'Identifier URI format',
      status: 'fail',
      detail: `Expected ${expectedUri}, got ${identifierUris[0]}`,
    });
  } else {
    results.push({
      category: cat,
      label: 'No identifier URI set',
      status: 'fail',
      detail: `Should be ${expectedUri}`,
    });
  }

  // access_as_user scope
  const api = fullAadApp.api as { oauth2PermissionScopes?: Array<{ value?: string }> } | undefined;
  const scopes = api?.oauth2PermissionScopes ?? [];
  const hasAccessAsUser = scopes.some((s) => s.value === 'access_as_user');
  if (hasAccessAsUser) {
    results.push({ category: cat, label: 'access_as_user scope', status: 'pass' });
  } else {
    results.push({ category: cat, label: 'access_as_user scope missing', status: 'fail' });
  }

  // Pre-authorized clients
  const preAuthorized =
    (api as { preAuthorizedApplications?: Array<{ appId?: string }> })?.preAuthorizedApplications ??
    [];
  const preAuthIds = preAuthorized.map((p) => p.appId);
  const teamsDesktop = '1fec8e78-bce4-4aaf-ab1b-5451cc387264';
  const teamsWeb = '5e3ce6c0-2b1f-4285-8d4b-75ee78787346';

  const hasDesktop = preAuthIds.includes(teamsDesktop);
  const hasWeb = preAuthIds.includes(teamsWeb);

  if (hasDesktop && hasWeb) {
    results.push({ category: cat, label: 'Teams clients pre-authorized', status: 'pass' });
  } else {
    const missing: string[] = [];
    if (!hasDesktop) missing.push('desktop');
    if (!hasWeb) missing.push('web');
    results.push({
      category: cat,
      label: 'Teams clients not pre-authorized',
      status: 'fail',
      detail: `Missing: ${missing.join(', ')}`,
    });
  }

  // Bot Framework redirect URI
  const web = fullAadApp.web as { redirectUris?: string[] } | undefined;
  const redirectUris = web?.redirectUris ?? [];
  const botFrameworkRedirect = 'https://token.botframework.com/.auth/web/redirect';
  if (redirectUris.includes(botFrameworkRedirect)) {
    results.push({ category: cat, label: 'Bot Framework redirect URI present', status: 'pass' });
  } else {
    results.push({
      category: cat,
      label: 'Bot Framework redirect URI missing',
      status: 'fail',
      detail: botFrameworkRedirect,
    });
  }

  // OAuth connection check (Azure only)
  if (azure) {
    try {
      interface AuthSetting {
        name: string;
        properties?: {
          serviceProviderDisplayName?: string;
          parameters?: Array<{ key: string; value: string }>;
        };
      }

      const settings = await runAz<AuthSetting[]>([
        'bot',
        'authsetting',
        'list',
        '--name',
        botId,
        '--resource-group',
        azure.resourceGroup,
        '--subscription',
        azure.subscription,
      ]);

      const aadConnections = settings.filter((s) => {
        const provider = s.properties?.serviceProviderDisplayName ?? '';
        return provider.includes('Azure Active Directory');
      });

      if (aadConnections.length === 0) {
        results.push({
          category: cat,
          label: 'No OAuth connection found',
          status: 'warn',
          detail: 'No AAD connection configured on Azure bot',
        });
      } else {
        for (const conn of aadConnections) {
          const connName = conn.name.split('/').pop() ?? conn.name;

          // List endpoint returns parameters: null — fetch full details via show
          const fullConn = await runAz<AuthSetting>([
            'bot',
            'authsetting',
            'show',
            '--name',
            botId,
            '--resource-group',
            azure.resourceGroup,
            '--subscription',
            azure.subscription,
            '--setting-name',
            connName,
          ]);

          const params = fullConn.properties?.parameters ?? [];
          const tokenExchange = params.find((p) => p.key === 'tokenExchangeUrl')?.value;

          if (tokenExchange) {
            const manifestResource = details.webApplicationInfoResource ?? '';
            const aadIdentifier = identifierUris[0] ?? '';

            const allMatch = tokenExchange === aadIdentifier && tokenExchange === manifestResource;
            if (allMatch) {
              results.push({
                category: cat,
                label: `OAuth "${connName}" — URIs aligned`,
                status: 'pass',
              });
            } else {
              results.push({
                category: cat,
                label: `OAuth "${connName}" — URI mismatch`,
                status: 'fail',
                detail: 'tokenExchangeUrl, identifier URI, and manifest resource should match',
              });
              logger.debug(`  tokenExchangeUrl: ${tokenExchange}`);
              logger.debug(`  AAD identifier:   ${aadIdentifier}`);
              logger.debug(`  manifest resource: ${manifestResource}`);
            }
          } else {
            results.push({
              category: cat,
              label: `OAuth "${connName}" — no tokenExchangeUrl`,
              status: 'warn',
            });
          }
        }
      }
    } catch (e) {
      results.push({
        category: cat,
        label: 'Could not check OAuth connections',
        status: 'warn',
        detail: e instanceof Error ? e.message : undefined,
      });
    }
  }
}

// --- Main command ---

async function runDoctor(appIdArg: string | undefined, json?: boolean): Promise<void> {
  const silent = !!json;
  const account = await getAccount();
  if (!account) {
    throw new CliError('AUTH_REQUIRED', 'Not logged in.', 'Run `teams login` first.');
  }

  let tdpToken: string;
  let appId: string;

  if (appIdArg) {
    tdpToken = (await getTokenSilent(teamsDevPortalScopes))!;
    if (!tdpToken) {
      throw new CliError('AUTH_TOKEN_FAILED', 'Failed to get token.', 'Try `teams login` again.');
    }
    appId = appIdArg;
  } else {
    const picked = await pickApp();
    tdpToken = picked.token;
    appId = picked.app.teamsAppId;
  }

  const spinner = createSilentSpinner('Fetching app details...', silent).start();

  let details: AppDetails;
  try {
    details = await fetchAppDetailsV2(tdpToken, appId);
  } catch (e) {
    spinner.error({ text: 'Failed to fetch app details' });
    throw new CliError(
      'NOT_FOUND_APP',
      e instanceof Error ? e.message : 'Failed to fetch app details.'
    );
  }

  spinner.stop();

  const appName = details.shortName || details.appId;
  if (!json) {
    logger.info(`\nDiagnosing: ${pc.bold(appName)} ${pc.dim(`(${details.appId})`)}`);
  }

  const allResults: CheckResult[] = [];

  // 1. Bot Registration
  spinner.update({ text: 'Checking bot registration...' }).start();
  const botResults: CheckResult[] = [];
  const botInfo = await checkBotRegistration(botResults, details, tdpToken, silent);
  spinner.stop();
  if (!json) {
    logger.info(`\n${pc.bold('Bot Registration')}`);
    printResults(botResults);
  }
  allResults.push(...botResults);

  if (!botInfo) {
    if (json) {
      emitDoctorJson(appId, appName, allResults);
    } else {
      printSummary(allResults);
    }
    return;
  }

  const { botId, location, tmBot, azure } = botInfo;

  // 2. AAD App
  spinner.update({ text: 'Checking AAD app...' }).start();
  let graphToken: string | null = null;
  try {
    graphToken = await getTokenSilent(graphScopes);
  } catch {
    // ignore
  }

  const aadResults: CheckResult[] = [];
  let fullAadApp: Record<string, unknown> | null = null;
  if (graphToken) {
    fullAadApp = await checkAadApp(aadResults, botId, graphToken);
  } else {
    aadResults.push({
      category: 'AAD App',
      label: 'Could not get Graph token',
      status: 'warn',
      detail: 'Run teams login to grant Graph permissions',
    });
  }
  spinner.stop();
  if (!json) {
    logger.info(`\n${pc.bold('AAD App')}`);
    printResults(aadResults);
  }
  allResults.push(...aadResults);

  // 3. Manifest
  const manifestResults: CheckResult[] = [];
  const endpoint = location === 'tm' ? tmBot?.messagingEndpoint : undefined;
  checkManifest(manifestResults, details, botId, endpoint);
  if (!json) {
    logger.info(`\n${pc.bold('Manifest')}`);
    printResults(manifestResults);
  }
  allResults.push(...manifestResults);

  // 4. SSO (only if webApplicationInfo configured)
  if (details.webApplicationInfoId && fullAadApp) {
    spinner.update({ text: 'Checking SSO configuration...' }).start();
    const ssoResults: CheckResult[] = [];
    await checkSso(ssoResults, details, botId, fullAadApp, azure);
    spinner.stop();
    if (!json) {
      logger.info(`\n${pc.bold('SSO')}`);
      printResults(ssoResults);
    }
    allResults.push(...ssoResults);
  }

  if (json) {
    emitDoctorJson(appId, appName, allResults);
  } else {
    printSummary(allResults);
  }
}

function emitDoctorJson(appId: string, appName: string, allResults: CheckResult[]): void {
  const result: DoctorOutput = {
    appId,
    appName,
    checks: allResults,
    summary: {
      total: allResults.length,
      pass: allResults.filter((r) => r.status === 'pass').length,
      fail: allResults.filter((r) => r.status === 'fail').length,
      warn: allResults.filter((r) => r.status === 'warn').length,
      info: allResults.filter((r) => r.status === 'info').length,
    },
  };
  outputJson(result);
}

export const appDoctorCommand = new Command('doctor')
  .description('Run diagnostic checks on a Teams app')
  .argument('[appId]', 'App ID')
  .option('--json', '[OPTIONAL] Output as JSON')
  .action(
    wrapAction(async (appIdArg: string | undefined, options: { json?: boolean }) => {
      await runDoctor(appIdArg, options.json);
    })
  );
