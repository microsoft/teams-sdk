import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    ...(mode === 'offline'
      ? {
          env: {
            TEAMS_CLI_TEST_OFFLINE: '1',
            TEAMS_CLI_TELEMETRY_OPTOUT: '1',
            RUN_INTEGRATION: '0',
          },
        }
      : {}),
    testTimeout: 120000,
    hookTimeout: 180000,
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**'],
  },
}));
