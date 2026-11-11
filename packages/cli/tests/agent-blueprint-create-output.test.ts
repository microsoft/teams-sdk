import { describe, it, expect, vi, afterEach } from 'vitest';
import type { AgentGeneratedConfig } from '../src/apps/agent-config.js';
import { toAgentBlueprintCreateOutput } from '../src/commands/agent/blueprint/create.js';
import { resolveGraphPermissionsDefault } from '../src/commands/agent/shared.js';
import { getConfig } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';

vi.mock('../src/utils/config.js', () => ({
  getConfig: vi.fn(),
}));

const ENV_PATH = '/work/.env';
const CONFIG_PATH = '/work/agent.generated.config.json';

function baseConfig(overrides: Partial<AgentGeneratedConfig> = {}): AgentGeneratedConfig {
  return {
    agentBlueprintName: 'My Agent',
    agentBlueprintId: 'bp-1',
    agentBlueprintObjectId: 'bp-obj-1',
    agentBlueprintServicePrincipalObjectId: 'bp-sp-1',
    completedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toAgentBlueprintCreateOutput', () => {
  it('maps the generated config to the create output shape', () => {
    const output = toAgentBlueprintCreateOutput(baseConfig(), CONFIG_PATH, ENV_PATH);

    expect(output).toEqual({
      agentBlueprintId: 'bp-1',
      agentBlueprintObjectId: 'bp-obj-1',
      managedIdentityPrincipalId: 'bp-sp-1',
      generatedConfigPath: CONFIG_PATH,
      envPath: ENV_PATH,
    });
  });

  it('includes messagingEndpoint when present', () => {
    const output = toAgentBlueprintCreateOutput(
      baseConfig({ messagingEndpoint: 'https://example.com/api/messages' }),
      CONFIG_PATH,
      ENV_PATH
    );

    expect(output.messagingEndpoint).toBe('https://example.com/api/messages');
  });

  it('omits messagingEndpoint when absent', () => {
    const output = toAgentBlueprintCreateOutput(baseConfig(), CONFIG_PATH, ENV_PATH);

    expect(output.messagingEndpoint).toBeUndefined();
    expect('messagingEndpoint' in output).toBe(false);
  });
});

describe('blueprint creation permissions', () => {
  afterEach(() => {
    vi.mocked(getConfig).mockReset();
    vi.restoreAllMocks();
  });

  it.each([
    'Mail.ReadWrite,Chat.ReadWrite',
    'Mail.ReadWrite Chat.ReadWrite',
    ' , Mail.ReadWrite,\tChat.ReadWrite\nMail.ReadWrite, ',
  ])('parses and deduplicates --permissions %j', async (scopes: string) => {
    expect(await resolveGraphPermissionsDefault(scopes, true)).toEqual([
      'Mail.ReadWrite',
      'Chat.ReadWrite',
    ]);
    expect(getConfig).not.toHaveBeenCalled();
  });

  it('parses whitespace-separated scopes from the configured default', async () => {
    vi.mocked(getConfig).mockResolvedValue('Mail.ReadWrite Chat.ReadWrite Mail.ReadWrite');

    expect(await resolveGraphPermissionsDefault(undefined, true)).toEqual([
      'Mail.ReadWrite',
      'Chat.ReadWrite',
    ]);
    expect(getConfig).toHaveBeenCalledWith('agent-default-permissions');
  });

  it.each(['', ' \t '])('explicit empty permissions %j bypass defaults without logging', async (scopes: string) => {
    vi.mocked(getConfig).mockResolvedValue('Mail.ReadWrite');
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});

    expect(await resolveGraphPermissionsDefault(scopes, false)).toBeUndefined();
    expect(getConfig).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
