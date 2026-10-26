import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
}

const calls: RecordedCall[] = [];

vi.mock('../src/utils/http.js', () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(
      JSON.stringify({ id: 'obj-id', appId: 'client-id', displayName: 'My Bot' }),
      {
        status: 201,
      }
    );
  }),
}));

async function loadWithTdpV2(enabled: boolean) {
  vi.doMock('../src/utils/tdp-host.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/utils/tdp-host.js')>()),
    TDP_BASE_URL: 'https://tdp.test/api',
    TDP_V2_BASE_URL: 'https://tdp-v2.test',
    isTdpV2Enabled: () => enabled,
  }));
  return import('../src/apps/tdp.js');
}

describe('createAadAppViaTdp', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../src/utils/tdp-host.js');
    vi.resetModules();
  });

  it('uses TDP v2 API v1.0/aadapplications when available', async () => {
    const { createAadAppViaTdp } = await loadWithTdpV2(true);

    const app = await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMultipleOrgs',
    });

    expect(app).toEqual({ id: 'obj-id', appId: 'client-id', displayName: 'My Bot' });
    expect(calls).toEqual([
      {
        url: 'https://tdp-v2.test/v1.0/aadapplications',
        method: 'POST',
        body: { displayName: 'My Bot', signInAudience: 'AzureADMultipleOrgs' },
      },
    ]);
  });

  it('falls back to legacy aadapp/v2 when a serviceManagementReference is set', async () => {
    const { createAadAppViaTdp } = await loadWithTdpV2(true);

    await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: 'smr-id',
      signInAudience: 'AzureADMultipleOrgs',
    });

    expect(calls).toEqual([
      {
        url: 'https://tdp.test/api/aadapp/v2',
        method: 'POST',
        body: {
          displayName: 'My Bot',
          signInAudience: 'AzureADMultipleOrgs',
          serviceManagementReference: 'smr-id',
        },
      },
    ]);
  });

  it('uses legacy aadapp/v2 when TDP v2 API is disabled', async () => {
    const { createAadAppViaTdp } = await loadWithTdpV2(false);

    await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMultipleOrgs',
    });

    expect(calls.map((c) => c.url)).toEqual(['https://tdp.test/api/aadapp/v2']);
  });
});
