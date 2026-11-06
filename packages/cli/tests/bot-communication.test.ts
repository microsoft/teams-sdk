import { beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

const calls: RecordedCall[] = [];
let responses: Array<{ status: number; body?: unknown }> = [];

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const next = responses.shift() ?? { status: 500 };
    const text = next.body === undefined ? '' : JSON.stringify(next.body);
    return new Response(text || null, { status: next.status });
  }),
}));

import {
  buildDefaultCommunicationConfiguration,
  getBotCommunicationConfiguration,
  putBotCommunicationConfiguration,
  setSocketMode,
  type BotCommunicationConfiguration,
} from '../src/apps/bot-communication.js';

const CLIENT_ID = '11111111-1111-1111-1111-111111111111';

const stored: BotCommunicationConfiguration = {
  endpointConfiguration: { callbackUri: 'https://example.com/api/messages', supportsSocketMode: false },
  teamworkConfiguration: {
    groupChatConfiguration: { messageNotificationMode: 'allMessages' },
    channelConfiguration: { messageNotificationMode: 'allMessages' },
    oneOnOneChatConfiguration: { messageNotificationMode: 'allMessages' },
    meetingChatConfiguration: { messageNotificationMode: 'allMessages' },
  },
};

describe('bot communication configuration', () => {
  beforeEach(() => {
    calls.length = 0;
    responses = [];
  });

  it('GET returns null on 404 (not configured yet)', async () => {
    responses = [{ status: 404 }];
    await expect(getBotCommunicationConfiguration('t', CLIENT_ID)).resolves.toBeNull();
    expect(calls[0]!.url).toBe(
      `https://dev.teams.microsoft.com/cosmicprodamer/v1.0/applications/${CLIENT_ID}/bot/communicationConfiguration`
    );
  });

  it('GET fills missing surfaces with defaults', async () => {
    responses = [{ status: 200, body: { endpointConfiguration: { supportsSocketMode: true } } }];
    const config = await getBotCommunicationConfiguration('t', CLIENT_ID);
    expect(config).toEqual({
      ...buildDefaultCommunicationConfiguration(),
      endpointConfiguration: { supportsSocketMode: true },
    });
  });

  it('GET includes the existing-bot limitation in the 403 message', async () => {
    responses = [{ status: 403 }];
    await expect(getBotCommunicationConfiguration('t', CLIENT_ID)).rejects.toMatchObject({
      code: 'API_ERROR',
      statusCode: 403,
      message:
        'Failed to read bot communication configuration: access denied (403). This feature is only available for new bots currently. ' +
        'Support for existing bots is coming soon.',
    });
  });

  it('setSocketMode replaces the raw PUT 403 response with the existing-bot limitation', async () => {
    responses = [
      { status: 200, body: stored },
      {
        status: 403,
        body: { errorMessage: 'User is not the owner of application', errorCode: 'Forbidden' },
      },
    ];
    await expect(setSocketMode('t', CLIENT_ID, true)).rejects.toMatchObject({
      code: 'API_ERROR',
      statusCode: 403,
      message:
        'Failed to update bot communication configuration: access denied (403). This feature is only available for new bots currently. ' +
        'Support for existing bots is coming soon.',
    });
    expect(calls.map((call) => call.method)).toEqual(['GET', 'PUT']);
  });

  it('preserves response details for other API errors', async () => {
    responses = [{ status: 500, body: { errorMessage: 'Service unavailable' } }];
    await expect(putBotCommunicationConfiguration('t', CLIENT_ID, stored)).rejects.toMatchObject({
      code: 'API_ERROR',
      statusCode: 500,
      message:
        'Failed to update bot communication configuration: 500 {"errorMessage":"Service unavailable"}',
    });
  });

  it('maps 401 to AUTH_TOKEN_FAILED', async () => {
    responses = [{ status: 401 }];
    await expect(getBotCommunicationConfiguration('t', CLIENT_ID)).rejects.toMatchObject({
      code: 'AUTH_TOKEN_FAILED',
      statusCode: 401,
    });
  });

  it('PUT falls back to the sent body when the response is empty', async () => {
    responses = [{ status: 204 }];
    await expect(putBotCommunicationConfiguration('t', CLIENT_ID, stored)).resolves.toEqual(stored);
    expect(calls[0]!.method).toBe('PUT');
  });

  it('setSocketMode PUTs full defaults when not configured', async () => {
    const expected = {
      ...buildDefaultCommunicationConfiguration(),
      endpointConfiguration: { supportsSocketMode: true },
    };
    responses = [{ status: 404 }, { status: 200, body: expected }];

    const result = await setSocketMode('t', CLIENT_ID, true);

    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT']);
    expect(calls[1]!.body).toEqual(expected);
    expect(calls[1]!.url).toBe(
      `https://dev.teams.microsoft.com/cosmicprodamer/v1.0/applications/${CLIENT_ID}/bot/communicationConfiguration`
    );
    expect(result).toEqual({ configuration: expected, changed: true });
  });

  it('setSocketMode preserves callbackUri and teamwork settings', async () => {
    const updated = {
      ...stored,
      endpointConfiguration: { ...stored.endpointConfiguration, supportsSocketMode: true },
    };
    responses = [{ status: 200, body: stored }, { status: 200, body: updated }];

    await setSocketMode('t', CLIENT_ID, true);

    expect(calls[1]!.body).toEqual(updated);
  });

  it('setSocketMode skips PUT when already in the requested state', async () => {
    responses = [{ status: 200, body: stored }];

    const result = await setSocketMode('t', CLIENT_ID, false);

    expect(calls).toHaveLength(1);
    expect(result.changed).toBe(false);
  });
  it('disables socket mode while preserving the endpoint and notification settings', async () => {
    const enabled = {
      ...stored,
      endpointConfiguration: { ...stored.endpointConfiguration, supportsSocketMode: true },
    };
    responses = [{ status: 200, body: enabled }, { status: 200, body: stored }];

    const result = await setSocketMode('t', CLIENT_ID, false);

    expect(calls[1]!.body).toEqual(stored);
    expect(result).toEqual({ configuration: stored, changed: true });
  });

  it('encodes the client ID in the production route', async () => {
    responses = [{ status: 404 }];
    await getBotCommunicationConfiguration('t', 'app/id?query');
    expect(calls[0]!.url).toBe(
      'https://dev.teams.microsoft.com/cosmicprodamer/v1.0/applications/app%2Fid%3Fquery/bot/communicationConfiguration'
    );
  });
});
