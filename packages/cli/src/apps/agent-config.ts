import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CliError } from '../utils/errors.js';

const GENERATED_CONFIG_FILENAME = 'agent.generated.config.json';

/** One agentic user created under a blueprint via `teams agent user create`. */
export interface AgentUserRecord {
  agentIdentityId: string;
  agenticUserId: string;
  /** Display name of the agentic user. */
  agenticUserName: string;
  userPrincipalName: string;
}

/** Shape of `agent.generated.config.json`, written by `teams agent blueprint create`. */
export interface AgentGeneratedConfig {
  /** Display name of the agent blueprint. */
  agentBlueprintName: string;
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  /** Object ID of the blueprint's service principal -- the managed identity used for the agent. */
  agentBlueprintServicePrincipalObjectId: string;
  messagingEndpoint?: string;
  /** Agentic users created under this blueprint via `teams agent user create`, in creation order. A blueprint can be reused across many. */
  agentUsers?: AgentUserRecord[];
  /** Microsoft Graph delegated scopes granted and made inheritable at create time via --permissions. */
  graphPermissions?: string[];
  completedAt: string;
}

export function getGeneratedConfigPath(cwd: string): string {
  return join(cwd, GENERATED_CONFIG_FILENAME);
}

/**
 * Read and parse `agent.generated.config.json` from the given directory.
 * Throws CliError('AGENT_CONFIG_NOT_FOUND', ...) if missing or unreadable.
 */
export function readGeneratedConfig(cwd: string): AgentGeneratedConfig {
  const path = getGeneratedConfigPath(cwd);

  if (!existsSync(path)) {
    throw new CliError(
      'AGENT_CONFIG_NOT_FOUND',
      `${GENERATED_CONFIG_FILENAME} was not found in ${cwd}.`,
      'Run `teams agent blueprint create <name>` from this folder first.'
    );
  }

  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as AgentGeneratedConfig;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    throw new CliError('AGENT_CONFIG_NOT_FOUND', `Failed to read ${GENERATED_CONFIG_FILENAME}: ${reason}`);
  }
}

export function writeGeneratedConfig(cwd: string, config: AgentGeneratedConfig): void {
  writeFileSync(getGeneratedConfigPath(cwd), `${JSON.stringify(config, null, 2)}\n`);
}

/** Merge `patch` into the existing generated config and write it back. */
export function updateGeneratedConfig(cwd: string, patch: Partial<AgentGeneratedConfig>): AgentGeneratedConfig {
  const config = { ...readGeneratedConfig(cwd), ...patch };
  writeGeneratedConfig(cwd, config);
  return config;
}

/** Append a newly-created agentic user record to the config's `agentUsers` list. */
export function appendAgentUser(cwd: string, user: AgentUserRecord): AgentGeneratedConfig {
  const config = readGeneratedConfig(cwd);
  return updateGeneratedConfig(cwd, { agentUsers: [...(config.agentUsers ?? []), user] });
}

/** Patch the `agentUsers` record matching `agenticUserId` in place (e.g. after a rename). No-op if not found. */
export function updateAgentUser(
  cwd: string,
  agenticUserId: string,
  patch: Partial<AgentUserRecord>
): AgentGeneratedConfig {
  const config = readGeneratedConfig(cwd);
  const agentUsers = (config.agentUsers ?? []).map((user) =>
    user.agenticUserId === agenticUserId ? { ...user, ...patch } : user
  );
  return updateGeneratedConfig(cwd, { agentUsers });
}

/** Remove the `agentUsers` record matching `agenticUserId` (e.g. after deletion). No-op if not found. */
export function removeAgentUser(cwd: string, agenticUserId: string): AgentGeneratedConfig {
  const config = readGeneratedConfig(cwd);
  const agentUsers = (config.agentUsers ?? []).filter((user) => user.agenticUserId !== agenticUserId);
  return updateGeneratedConfig(cwd, { agentUsers });
}

/** Config file `teams agent blueprint create` writes that should never be committed. */
export const AGENT_GITIGNORE_ENTRIES = [GENERATED_CONFIG_FILENAME];

/**
 * Append any of `entries` missing from `cwd`'s `.gitignore` (created if
 * absent). Used so the generated config/secret files -- and the .env Teams
 * SDK credentials merged alongside them -- never get committed.
 */
export function ensureGitignoreEntries(cwd: string, entries: string[]): void {
  const gitignorePath = join(cwd, '.gitignore');
  const existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const existingLines = new Set(existing.split('\n').map((line) => line.trim()));

  const missing = entries.filter((entry) => !existingLines.has(entry));
  if (missing.length === 0) return;

  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  writeFileSync(gitignorePath, `${existing}${prefix}${missing.join('\n')}\n`);
}
