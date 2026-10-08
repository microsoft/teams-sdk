import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the host module instead of setting TEAMS_DEV_API so process.env is never mutated.
vi.mock('../src/utils/tdp-host.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/tdp-host.js')>()),
  BOT_COMMUNICATION_BASE_URL: 'https://dev-int.teams.microsoft.com/cosmictestamer',
}));

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
      `https://dev-int.teams.microsoft.com/cosmictestamer/v1.0/applications/${CLIENT_ID}/bot/communicationConfiguration`
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

  it('maps 403 to a CliError with an ownership hint', async () => {
    responses = [{ status: 403 }];
    await expect(getBotCommunicationConfiguration('t', CLIENT_ID)).rejects.toMatchObject({
      code: 'API_ERROR',
      statusCode: 403,
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
});

describe('bot communication configuration without TEAMS_DEV_API', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
    vi.doMock('../src/utils/tdp-host.js', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/utils/tdp-host.js')>()),
      BOT_COMMUNICATION_BASE_URL: undefined,
    }));
  });

  afterEach(() => {
    vi.doUnmock('../src/utils/tdp-host.js');
    vi.resetModules();
  });

  it('is unavailable and makes no network calls', async () => {
    const mod = await import('../src/apps/bot-communication.js');

    expect(mod.isBotCommunicationApiAvailable()).toBe(false);
    await expect(mod.getBotCommunicationConfiguration('t', CLIENT_ID)).rejects.toMatchObject({
      code: 'API_ERROR',
      suggestion: expect.stringContaining('TEAMS_DEV_API=1'),
    });
    expect(calls).toHaveLength(0);
  });
});
