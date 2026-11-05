import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAadApp,
  getAadAppByClientId,
  getAadAppFull,
  updateAadApp,
} from '../src/apps/graph.js';
import { createAadAppViaTdp } from '../src/apps/tdp.js';
import { apiFetch } from '../src/utils/http.js';

vi.mock('../src/utils/http.js', () => ({ apiFetch: vi.fn() }));

interface ErrorCase {
  name: string;
  run: () => Promise<unknown>;
  message: string;
}

const errorCases: ErrorCase[] = [
  {
    name: 'Graph creation',
    run: () => createAadApp('token', 'Test App'),
    message: 'Failed to create Entra app: 403 Forbidden',
  },
  {
    name: 'Graph lookup',
    run: () => getAadAppByClientId('token', 'client-id'),
    message: 'Failed to look up Entra app: 403 Forbidden',
  },
  {
    name: 'Graph details',
    run: () => getAadAppFull('token', 'object-id'),
    message: 'Failed to get Entra app: 403 Forbidden',
  },
  {
    name: 'Graph update',
    run: () => updateAadApp('token', 'object-id', { displayName: 'Test App' }),
    message: 'Failed to update Entra app: 403 Forbidden',
  },
  ...[false, true].map((enabled: boolean): ErrorCase => ({
    name: `TDP creation (v2=${enabled})`,
    run: async (): Promise<unknown> => {
      vi.stubEnv('TEAMS_DEV_API', enabled ? '1' : '0');
      return createAadAppViaTdp('token', 'Test App', {
        serviceManagementReference: undefined,
        signInAudience: 'AzureADMultipleOrgs',
      });
    },
    message: 'Failed to create Entra app: 403 Forbidden',
  })),
];

describe('Entra API error messages', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it.each(errorCases)('$name uses Entra wording', async ({ run, message }: ErrorCase) => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('Forbidden', { status: 403 }));
    await expect(run()).rejects.toThrow(message);
  });

  it('uses Entra wording when Graph finds no app', async () => {
    vi.mocked(apiFetch).mockResolvedValue(Response.json({ value: [] }));
    await expect(getAadAppByClientId('token', 'client-id')).rejects.toThrow(
      'No Entra app found with clientId client-id'
    );
  });
});
