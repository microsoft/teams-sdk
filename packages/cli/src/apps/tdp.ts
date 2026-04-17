import type { AadApp } from './graph.js';
import { apiFetch } from '../utils/http.js';

const TDP_BASE_URL = 'https://dev.teams.microsoft.com/api';

/**
 * Create an AAD app via TDP, which also creates the service principal server-side.
 */
export async function createAadAppViaTdp(token: string, displayName: string): Promise<AadApp> {
  const response = await apiFetch(`${TDP_BASE_URL}/aadapp/v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      signInAudience: 'AzureADMultipleOrgs',
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

  return response.json();
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

export async function fetchBot(token: string, botId: string): Promise<BotDetails> {
  const response = await apiFetch(`${TDP_BASE_URL}/botframework/${botId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bot: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
}
