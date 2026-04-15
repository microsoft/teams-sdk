// RED/GREEN: verified 2026-04-09 — each guard (autoConfirm, silent, isInteractive, confirm call)
// was broken individually and the expected tests failed before restoring correct code.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the confirmAction() utility.
 * Verifies behavior across modes: --yes, --json (silent), non-interactive, interactive.
 *
 * Strategy: mock only @inquirer/prompts and control the real module's state via
 * setAutoConfirm() and process.stdin.isTTY / TEAMS_NO_INTERACTIVE env var.
 */

const mockConfirm = vi.fn();

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

// Import the real module — we control its behavior via setAutoConfirm + env
import { confirmAction, setAutoConfirm } from '../src/utils/interactive.js';

describe('confirmAction', () => {
  let originalIsTTY: PropertyDescriptor | undefined;
  let originalNoInteractive: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    setAutoConfirm(false);
    mockConfirm.mockResolvedValue(true);

    // Save originals
    originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    originalNoInteractive = process.env.TEAMS_NO_INTERACTIVE;

    // Default: interactive TTY
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    delete process.env.TEAMS_NO_INTERACTIVE;
  });

  afterEach(() => {
    // Restore originals
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    } else {
      Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true });
    }
    if (originalNoInteractive !== undefined) {
      process.env.TEAMS_NO_INTERACTIVE = originalNoInteractive;
    } else {
      delete process.env.TEAMS_NO_INTERACTIVE;
    }
    setAutoConfirm(false);
  });

  it('returns true without prompting when --yes is active', async () => {
    setAutoConfirm(true);

    const result = await confirmAction('Do something?');

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('returns true without prompting when silent (--json)', async () => {
    const result = await confirmAction('Do something?', true);

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('returns true without prompting when non-interactive (no TTY)', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    const result = await confirmAction('Do something?');

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('returns true without prompting when TEAMS_NO_INTERACTIVE is set', async () => {
    process.env.TEAMS_NO_INTERACTIVE = '1';

    const result = await confirmAction('Do something?');

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('prompts and returns true when user accepts', async () => {
    mockConfirm.mockResolvedValue(true);

    const result = await confirmAction('Create app?');

    expect(result).toBe(true);
    expect(mockConfirm).toHaveBeenCalledOnce();
    expect(mockConfirm).toHaveBeenCalledWith({ message: 'Create app?', default: true });
  });

  it('prompts and returns false when user declines', async () => {
    mockConfirm.mockResolvedValue(false);

    const result = await confirmAction('Create app?');

    expect(result).toBe(false);
    expect(mockConfirm).toHaveBeenCalledOnce();
  });

  it('--yes takes priority over interactive mode', async () => {
    setAutoConfirm(true);

    const result = await confirmAction('Do something?');

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('silent takes priority over interactive mode', async () => {
    const result = await confirmAction('Do something?', true);

    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
