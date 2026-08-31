import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BotDetails } from '../src/apps/tdp.js';

// --- Mock state ---

const baseBot: BotDetails = {
  botId: 'bot-1',
  name: 'My Bot',
  messagingEndpoint: 'https://example.com/api/messages',
  callingEndpoint: null,
  description: 'a bot',
  configuredChannels: ['msteams'],
};

let serverBot: BotDetails = structuredClone(baseBot);
let serverStatus = 200;
let getCount = 0;
let postCount = 0;
let deleteCount = 0;

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      getCount++;
      if (serverStatus === 404) {
        return { ok: false, status: 404, statusText: 'Not Found', text: async () => 'not found' };
      }
      return { ok: true, status: 200, json: async () => structuredClone(serverBot) };
    }
    if (method === 'POST') {
      postCount++;
      serverBot = { ...serverBot, ...(JSON.parse(init!.body as string) as BotDetails) };
      return { ok: true, status: 200, json: async () => structuredClone(serverBot), text: async () => '' };
    }
    if (method === 'DELETE') {
      deleteCount++;
      return { ok: true, status: 204, text: async () => '' };
    }
    void url;
    return { ok: true, status: 200, json: async () => ({}) };
  }),
}));

import { fetchBot, updateBot, deleteBot } from '../src/apps/tdp.js';
import { getBotLocation } from '../src/apps/bot-location.js';
import { invalidateBot } from '../src/apps/bot-cache.js';

describe('bot read cache', () => {
  beforeEach(() => {
    serverBot = structuredClone(baseBot);
    serverStatus = 200;
    getCount = 0;
    postCount = 0;
    deleteCount = 0;
    invalidateBot();
  });

  it('serves a second fetchBot for the same id from cache (one network GET)', async () => {
    const a = await fetchBot('token', 'bot-1');
    const b = await fetchBot('token', 'bot-1');

    expect(a.botId).toBe('bot-1');
    expect(b.messagingEndpoint).toBe(baseBot.messagingEndpoint);
    expect(getCount).toBe(1);
  });

  it('lets fetchBot and getBotLocation share a single network round-trip', async () => {
    await fetchBot('token', 'bot-1');
    const location = await getBotLocation('token', 'bot-1');

    expect(location).toBe('tm');
    expect(getCount).toBe(1);
  });

  it('caches a 404 as azure and serves it without another GET', async () => {
    serverStatus = 404;

    const location = await getBotLocation('token', 'bot-1');
    expect(location).toBe('azure');
    expect(getCount).toBe(1);

    // fetchBot on a known-azure bot still rejects, but makes no extra network call.
    await expect(fetchBot('token', 'bot-1')).rejects.toThrow();
    expect(getCount).toBe(1);
  });

  it('refreshes the cache from updateBot so later reads need no GET', async () => {
    await fetchBot('token', 'bot-1');
    expect(getCount).toBe(1);

    await updateBot('token', { ...baseBot, messagingEndpoint: 'https://new.example.com/api/messages' });

    const after = await fetchBot('token', 'bot-1');
    expect(after.messagingEndpoint).toBe('https://new.example.com/api/messages');
    expect(getCount).toBe(1);
  });

  it('re-fetches after deleteBot invalidates the cache', async () => {
    await fetchBot('token', 'bot-1');
    await deleteBot('token', 'bot-1');
    await fetchBot('token', 'bot-1');

    expect(getCount).toBe(2);
  });

  it('does not let callers corrupt the cached bot (clone safety)', async () => {
    const first = await fetchBot('token', 'bot-1');
    first.messagingEndpoint = 'mutated';
    first.configuredChannels.push('hacked');

    const second = await fetchBot('token', 'bot-1');
    expect(second.messagingEndpoint).toBe(baseBot.messagingEndpoint);
    expect(second.configuredChannels).toEqual(['msteams']);
    expect(getCount).toBe(1);
  });
});
