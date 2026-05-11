import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRunAz = vi.fn();

vi.mock('../src/utils/az.js', () => ({
  runAz: (...args: unknown[]) => mockRunAz(...args),
}));

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: () => ({ stop: () => {}, success: () => {} }),
  }),
}));

vi.mock('../src/apps/tdp.js', () => ({
  registerBot: vi.fn(),
  fetchBot: vi.fn(),
  updateBot: vi.fn(),
}));

import { discoverAzureBot } from '../src/apps/bot-handler.js';

const BOT_ID = 'd0d5fd3e-1111-2222-3333-444455556666';

describe('discoverAzureBot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds bot via name fast-path when resource name == botId', async () => {
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource' && args[1] === 'list' && args.includes('--name')) {
        return Promise.resolve([
          { id: '/x/' + BOT_ID, name: BOT_ID, resourceGroup: 'rg-1', location: 'global' },
        ]);
      }
      if (args[0] === 'account') {
        return Promise.resolve({ id: 'sub-1', tenantId: 'tenant-1' });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toEqual({
      subscription: 'sub-1',
      resourceGroup: 'rg-1',
      region: 'global',
      tenantId: 'tenant-1',
      name: BOT_ID,
    });
    // Should not need any fallback graph or per-resource calls
    const calls = mockRunAz.mock.calls.map((c) => c[0] as string[]);
    expect(calls.some((a) => a[0] === 'graph')).toBe(false);
    expect(calls.some((a) => a[0] === 'resource' && a[1] === 'show')).toBe(false);
  });

  it('falls back to msaAppId match via Resource Graph', async () => {
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource' && args[1] === 'list' && args.includes('--name')) {
        return Promise.resolve([]); // fast-path miss
      }
      if (args[0] === 'graph' && args[1] === 'query') {
        return Promise.resolve({
          data: [
            {
              id: '/subscriptions/sub-from-graph/resourceGroups/rg-2/providers/Microsoft.BotService/botServices/my-bot',
              name: 'my-bot',
              resourceGroup: 'rg-2',
              location: 'global',
              subscriptionId: 'sub-from-graph',
              msaAppId: BOT_ID,
            },
          ],
        });
      }
      if (args[0] === 'account') {
        return Promise.resolve({ id: 'sub-active', tenantId: 'tenant-2' });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toEqual({
      subscription: 'sub-from-graph',
      resourceGroup: 'rg-2',
      region: 'global',
      tenantId: 'tenant-2',
      name: 'my-bot',
    });
    // Should not fall through to per-resource show
    const calls = mockRunAz.mock.calls.map((c) => c[0] as string[]);
    expect(calls.some((a) => a[0] === 'resource' && a[1] === 'show')).toBe(false);
  });

  it('parses subscription from ARM id when graph result omits subscriptionId', async () => {
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource' && args[1] === 'list' && args.includes('--name')) {
        return Promise.resolve([]);
      }
      if (args[0] === 'graph' && args[1] === 'query') {
        return Promise.resolve({
          data: [
            {
              id: '/subscriptions/sub-from-id/resourceGroups/rg-9/providers/Microsoft.BotService/botServices/my-bot',
              name: 'my-bot',
              resourceGroup: 'rg-9',
              location: 'global',
              msaAppId: BOT_ID,
            },
          ],
        });
      }
      if (args[0] === 'account') {
        return Promise.resolve({ id: 'sub-active', tenantId: 'tenant-x' });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx?.subscription).toBe('sub-from-id');
  });

  it('falls back to list+show when Resource Graph fails', async () => {
    const otherBot = {
      id: '/subs/x/rg/rg-other/.../some-other-bot',
      name: 'some-other-bot',
      resourceGroup: 'rg-other',
      location: 'westus',
    };
    const ourBot = {
      id: '/subs/x/rg/rg-2/.../my-bot',
      name: 'my-bot',
      resourceGroup: 'rg-2',
      location: 'global',
    };
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource' && args[1] === 'list' && args.includes('--name')) {
        return Promise.resolve([]);
      }
      if (args[0] === 'graph') {
        return Promise.reject(new Error('extension blocked'));
      }
      if (args[0] === 'resource' && args[1] === 'list') {
        return Promise.resolve([otherBot, ourBot]);
      }
      if (args[0] === 'resource' && args[1] === 'show') {
        const id = args[args.indexOf('--ids') + 1];
        if (id === otherBot.id) {
          return Promise.resolve({ ...otherBot, properties: { msaAppId: 'not-our-bot' } });
        }
        if (id === ourBot.id) {
          return Promise.resolve({ ...ourBot, properties: { msaAppId: BOT_ID } });
        }
      }
      if (args[0] === 'account') {
        return Promise.resolve({ id: 'sub-2', tenantId: 'tenant-2' });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toEqual({
      subscription: 'sub-2',
      resourceGroup: 'rg-2',
      region: 'global',
      tenantId: 'tenant-2',
      name: 'my-bot',
    });
  });

  it('returns null when neither Resource Graph nor list+show find the bot', async () => {
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource') return Promise.resolve([]);
      if (args[0] === 'graph') return Promise.resolve({ data: [] });
      if (args[0] === 'account') {
        return Promise.resolve({ id: 'sub-3', tenantId: 'tenant-3' });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toBeNull();
  });

  it('returns null when fallback list+show has no matching msaAppId', async () => {
    mockRunAz.mockImplementation((args: string[]) => {
      if (args[0] === 'resource' && args[1] === 'list' && args.includes('--name')) {
        return Promise.resolve([]);
      }
      if (args[0] === 'graph') return Promise.reject(new Error('no extension'));
      if (args[0] === 'resource' && args[1] === 'list') {
        return Promise.resolve([
          { id: '/x/unrelated', name: 'unrelated', resourceGroup: 'rg-x', location: 'eastus' },
        ]);
      }
      if (args[0] === 'resource' && args[1] === 'show') {
        return Promise.resolve({
          id: '/x/unrelated',
          name: 'unrelated',
          resourceGroup: 'rg-x',
          location: 'eastus',
          properties: { msaAppId: 'someone-else' },
        });
      }
      throw new Error(`unexpected az call: ${args.join(' ')}`);
    });

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toBeNull();
  });

  it('returns null when az CLI throws', async () => {
    mockRunAz.mockRejectedValue(new Error('az exploded'));

    const ctx = await discoverAzureBot(BOT_ID, true);

    expect(ctx).toBeNull();
  });
});
