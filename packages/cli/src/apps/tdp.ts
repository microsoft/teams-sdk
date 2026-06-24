import type { AadApp } from './graph.js';
import { apiFetch } from '../utils/http.js';
import { invalidateAppDetails } from './app-details-cache.js';
import { getCachedBot, setCachedBot, invalidateBot, type BotResource } from './bot-cache.js';

const TDP_BASE_URL = 'https://dev.teams.microsoft.com/api';

export type SignInAudience = 'AzureADMyOrg' | 'AzureADMultipleOrgs';

export interface CreateAadAppViaTdpOptions {
  serviceManagementReference: string | undefined;
  signInAudience: SignInAudience;
}

/**
 * Create an AAD app via TDP, which also creates the service principal server-side.
 */
export async function createAadAppViaTdp(
  token: string,
  displayName: string,
  options: CreateAadAppViaTdpOptions
): Promise<AadApp> {
  const response = await apiFetch(`${TDP_BASE_URL}/aadapp/v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      signInAudience: options.signInAudience,
      ...(options.serviceManagementReference && {
        serviceManagementReference: options.serviceManagementReference,
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create AAD app: ${response.status} ${error}`);
  }

  return response.json();
}

export interface ImportedApp {
  teamsAppId: string;
}

export interface BotRegistration {
  botId: string;
  name: string;
}

export async function importAppPackage(
  token: string,
  zipBuffer: Buffer,
  overwrite?: boolean
): Promise<ImportedApp> {
  const query = overwrite ? '?overwriteIfAppAlreadyExists=true' : '';
  const response = await apiFetch(`${TDP_BASE_URL}/appdefinitions/v2/import${query}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
    },
    body: new Uint8Array(zipBuffer),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to import app package: ${response.status} ${error}`);
  }

  const imported = (await response.json()) as ImportedApp;
  // A package import rewrites the app definition server-side outside the
  // updateAppDetails path, so any cached details for this app are now stale.
  invalidateAppDetails(imported.teamsAppId);
  return imported;
}

export async function registerBot(
  token: string,
  options: {
    botId: string;
    name: string;
    endpoint: string;
    description?: string;
    callingEndpoint?: string;
    configuredChannels?: string[];
  }
): Promise<BotRegistration> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      botId: options.botId,
      name: options.name,
      description: options.description ?? '',
      messagingEndpoint: options.endpoint,
      callingEndpoint: options.callingEndpoint ?? '',
      configuredChannels: options.configuredChannels ?? ['msteams'],
      isSingleTenant: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register bot: ${response.status} ${error}`);
  }

  // A newly registered bot changes its read outcome (e.g. a prior 404/azure).
  invalidateBot(options.botId);
  return response.json();
}

export interface BotDetails {
  botId: string;
  name: string;
  messagingEndpoint: string;
  callingEndpoint: string | null;
  description: string;
  configuredChannels: string[];
  isSingleTenant?: boolean;
  iconUrl?: string;
}

/**
 * Read `GET /botframework/{botId}` once and classify the outcome:
 * 200 → Teams-managed (with full details), 404 → Azure. The result is cached so
 * that `fetchBot` and `getBotLocation` share a single network round-trip.
 *
 * Only the two meaningful outcomes (200/404) are cached; other statuses throw
 * uncached so transient failures still retry.
 */
export async function readBotResource(token: string, botId: string): Promise<BotResource> {
  const cached = getCachedBot(botId);
  if (cached) return cached;

  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const bot = (await response.json()) as BotDetails;
    const resource: BotResource = { status: 'tm', bot };
    setCachedBot(botId, resource);
    return resource;
  }
  if (response.status === 404) {
    const resource: BotResource = { status: 'azure' };
    setCachedBot(botId, resource);
    return resource;
  }

  throw new Error(`Failed to read bot registration: ${response.status} ${response.statusText}`);
}

export async function fetchBot(token: string, botId: string): Promise<BotDetails> {
  const resource = await readBotResource(token, botId);
  if (resource.status === 'azure') {
    // No Teams-managed registration exists for this bot (it lives in Azure).
    throw new Error(`Failed to fetch bot: 404 Not Found`);
  }
  return resource.bot;
}

export async function deleteBot(token: string, botId: string): Promise<void> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to delete bot: ${response.status} ${error}`);
  }

  invalidateBot(botId);
}

export interface MeetingSubscription {
  id: string;
  eventTypes: string[];
}

export async function fetchMeetingSubscription(
  token: string,
  botId: string
): Promise<MeetingSubscription | null> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}/meetings/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  return response.json();
}

export async function setMeetingSubscription(
  token: string,
  botId: string,
  eventTypes: string[]
): Promise<void> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}/meetings/subscription`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventTypes),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to set meeting subscription: ${response.status} ${error}`);
  }
}

export async function updateBot(token: string, bot: BotDetails): Promise<void> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${bot.botId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bot),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update bot: ${response.status} ${error}`);
  }

  // We just wrote this exact object server-side, so refresh the cache with it.
  setCachedBot(bot.botId, { status: 'tm', bot });
}
