import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createAadAppViaTdp } from '../src/apps/tdp.js';
import { apiFetch } from '../src/utils/http.js';

describe('createAadAppViaTdp', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it('uses production TDP v2 app creation to make the caller an owner', async () => {
    const app = await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMultipleOrgs',
    });

    expect(app).toEqual({ id: 'obj-id', appId: 'client-id', displayName: 'My Bot' });
    expect(calls).toEqual([
      {
        url: 'https://dev.teams.microsoft.com/cosmicprodamer/v1.0/aadapplications',
        method: 'POST',
        body: { displayName: 'My Bot', signInAudience: 'AzureADMultipleOrgs' },
      },
    ]);
  });

  it('falls back to legacy aadapp/v2 when a serviceManagementReference is set', async () => {
    await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: 'smr-id',
      signInAudience: 'AzureADMultipleOrgs',
    });

    expect(calls).toEqual([
      {
        url: 'https://dev.teams.microsoft.com/api/aadapp/v2',
        method: 'POST',
        body: {
          displayName: 'My Bot',
          signInAudience: 'AzureADMultipleOrgs',
          serviceManagementReference: 'smr-id',
        },
      },
    ]);
  });

  it('preserves the requested sign-in audience on v2', async () => {
    await createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMyOrg',
    });

    expect(calls[0]!.body).toEqual({ displayName: 'My Bot', signInAudience: 'AzureADMyOrg' });
  });

  it('surfaces a v2 failure without retrying app creation on the legacy API', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    await expect(createAadAppViaTdp('t', 'My Bot', {
      serviceManagementReference: undefined,
      signInAudience: 'AzureADMultipleOrgs',
    })).rejects.toThrow('Failed to create AAD app: 403 Forbidden');
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      'https://dev.teams.microsoft.com/cosmicprodamer/v1.0/aadapplications',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
