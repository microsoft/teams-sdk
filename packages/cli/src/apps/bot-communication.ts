import { apiFetch } from '../utils/http.js';
import { CliError } from '../utils/errors.js';

// TODO(prod): switch to the prod host/path once TDP ships the bot communication API to prod.
const BOT_COMMUNICATION_BASE_URL = 'https://dev-int.teams.microsoft.com/cosmictestamer';

export type MessageNotificationMode = 'atMentionedMessagesOnly' | 'allMessages' | 'unknownFutureValue';

export interface BotMessageNotificationConfiguration {
  messageNotificationMode: MessageNotificationMode;
}

export interface BotEndpointConfiguration {
  callbackUri?: string;
  supportsSocketMode: boolean;
}

export interface BotTeamworkConfiguration {
  groupChatConfiguration: BotMessageNotificationConfiguration;
  channelConfiguration: BotMessageNotificationConfiguration;
  oneOnOneChatConfiguration: BotMessageNotificationConfiguration;
  meetingChatConfiguration: BotMessageNotificationConfiguration;
}

/**
 * Complete configuration as sent on PUT. PUT is a full replace, so every
 * surface must be present or the server resets it to its default.
 */
export interface BotCommunicationConfiguration {
  endpointConfiguration: BotEndpointConfiguration;
  teamworkConfiguration: BotTeamworkConfiguration;
}

/** Wire shape returned by the API; every object is nullable server-side. */
interface BotCommunicationConfigurationResponse {
  endpointConfiguration?: {
    callbackUri?: string | null;
    supportsSocketMode?: boolean;
  } | null;
  teamworkConfiguration?: {
    groupChatConfiguration?: BotMessageNotificationConfiguration | null;
    channelConfiguration?: BotMessageNotificationConfiguration | null;
    oneOnOneChatConfiguration?: BotMessageNotificationConfiguration | null;
    meetingChatConfiguration?: BotMessageNotificationConfiguration | null;
  } | null;
}

export interface SetSocketModeResult {
  configuration: BotCommunicationConfiguration;
  /** False when the stored value already matched and no PUT was sent. */
  changed: boolean;
}

/** Server defaults for an app that has no communication configuration yet. */
export function buildDefaultCommunicationConfiguration(): BotCommunicationConfiguration {
  return {
    endpointConfiguration: { supportsSocketMode: false },
    teamworkConfiguration: {
      groupChatConfiguration: { messageNotificationMode: 'atMentionedMessagesOnly' },
      channelConfiguration: { messageNotificationMode: 'atMentionedMessagesOnly' },
      oneOnOneChatConfiguration: { messageNotificationMode: 'allMessages' },
      meetingChatConfiguration: { messageNotificationMode: 'atMentionedMessagesOnly' },
    },
  };
}

function toCompleteConfiguration(
  response: BotCommunicationConfigurationResponse
): BotCommunicationConfiguration {
  const defaults = buildDefaultCommunicationConfiguration();
  const endpoint = response.endpointConfiguration;
  const teamwork = response.teamworkConfiguration;

  return {
    endpointConfiguration: {
      ...(endpoint?.callbackUri && { callbackUri: endpoint.callbackUri }),
      supportsSocketMode:
        endpoint?.supportsSocketMode ?? defaults.endpointConfiguration.supportsSocketMode,
    },
    teamworkConfiguration: {
      groupChatConfiguration:
        teamwork?.groupChatConfiguration ?? defaults.teamworkConfiguration.groupChatConfiguration,
      channelConfiguration:
        teamwork?.channelConfiguration ?? defaults.teamworkConfiguration.channelConfiguration,
      oneOnOneChatConfiguration:
        teamwork?.oneOnOneChatConfiguration ??
        defaults.teamworkConfiguration.oneOnOneChatConfiguration,
      meetingChatConfiguration:
        teamwork?.meetingChatConfiguration ??
        defaults.teamworkConfiguration.meetingChatConfiguration,
    },
  };
}

function communicationConfigurationUrl(clientId: string): string {
  return `${BOT_COMMUNICATION_BASE_URL}/v1.0/applications/${encodeURIComponent(clientId)}/bot/communicationConfiguration`;
}

async function toApiError(action: string, response: Response): Promise<CliError> {
  const body = await response.text();
  const detail = body ? ` ${body}` : '';
  const message = `Failed to ${action}: ${response.status}${detail}`;

  if (response.status === 401) {
    return new CliError('AUTH_TOKEN_FAILED', message, 'Run `teams login` and try again.', 401);
  }
  if (response.status === 403) {
    return new CliError(
      'API_ERROR',
      message,
      'Make sure you are an owner of the Microsoft Entra app for this bot.',
      403
    );
  }
  return new CliError('API_ERROR', message, undefined, response.status);
}

/**
 * Read the bot communication configuration for an app.
 * Returns null when the app has not been configured yet (404).
 */
export async function getBotCommunicationConfiguration(
  token: string,
  clientId: string
): Promise<BotCommunicationConfiguration | null> {
  const response = await apiFetch(communicationConfigurationUrl(clientId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw await toApiError('read bot communication configuration', response);
  }

  const body = (await response.json()) as BotCommunicationConfigurationResponse;
  return toCompleteConfiguration(body);
}

/**
 * Replace the bot communication configuration for an app. Creates it if none exists.
 * Always sends the complete object because PUT is a full replace.
 */
export async function putBotCommunicationConfiguration(
  token: string,
  clientId: string,
  configuration: BotCommunicationConfiguration
): Promise<BotCommunicationConfiguration> {
  const response = await apiFetch(communicationConfigurationUrl(clientId), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configuration),
  });

  if (!response.ok) {
    throw await toApiError('update bot communication configuration', response);
  }

  const text = await response.text();
  if (!text) return configuration;
  return toCompleteConfiguration(JSON.parse(text) as BotCommunicationConfigurationResponse);
}

/**
 * Enable or disable socket mode while preserving every other setting.
 * GET → modify → PUT; a missing configuration starts from server defaults.
 */
export async function setSocketMode(
  token: string,
  clientId: string,
  enabled: boolean
): Promise<SetSocketModeResult> {
  const existing = await getBotCommunicationConfiguration(token, clientId);

  if (existing && existing.endpointConfiguration.supportsSocketMode === enabled) {
    return { configuration: existing, changed: false };
  }

  const base = existing ?? buildDefaultCommunicationConfiguration();
  const configuration = await putBotCommunicationConfiguration(token, clientId, {
    ...base,
    endpointConfiguration: { ...base.endpointConfiguration, supportsSocketMode: enabled },
  });

  return { configuration, changed: true };
}
