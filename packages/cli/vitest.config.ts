import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000,
    hookTimeout: 180000,
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**'],
  },
});
