import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('self-update safety checks', () => {
  it('does not build a self-update command for a local source checkout', async () => {
    const { getSelfUpdateCommand } = await import('../src/utils/self-update.js');

    expect(getSelfUpdateCommand()).toBeUndefined();
  });

  it('refuses a local source checkout before doing version preflight', async () => {
    const { runSelfUpdate } = await import('../src/commands/self-update.js');

    await expect(runSelfUpdate()).resolves.toBe(false);
  });
});
