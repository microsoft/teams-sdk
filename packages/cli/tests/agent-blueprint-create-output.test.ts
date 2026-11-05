import { describe, it, expect } from 'vitest';
import type { AgentGeneratedConfig } from '../src/apps/agent-config.js';
import { toAgentBlueprintCreateOutput } from '../src/commands/agent/blueprint/create.js';

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

  it('always includes envPath and generatedConfigPath', () => {
    const output = toAgentBlueprintCreateOutput(baseConfig(), CONFIG_PATH, ENV_PATH);
    expect(output.envPath).toBe(ENV_PATH);
    expect(output.generatedConfigPath).toBe(CONFIG_PATH);
  });
});
