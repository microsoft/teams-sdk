import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isMap, isSeq, parseDocument } from 'yaml';

vi.mock('../src/utils/update-info.js', () => ({ getCurrentVersion: vi.fn() }));
vi.mock('../src/utils/browser.js', () => ({ openInBrowser: vi.fn() }));
vi.mock('../src/utils/interactive.js', () => ({
  isInteractive: vi.fn(),
  isLocalSession: vi.fn(),
}));
vi.mock('../src/utils/json-output.js', () => ({ outputJson: vi.fn() }));
vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { feedbackCommand } from '../src/commands/feedback.js';
import { openInBrowser } from '../src/utils/browser.js';
import { isInteractive, isLocalSession } from '../src/utils/interactive.js';
import { outputJson } from '../src/utils/json-output.js';
import { logger } from '../src/utils/logger.js';
import { getCurrentVersion } from '../src/utils/update-info.js';

const FEEDBACK_URL = `https://github.com/microsoft/teams-sdk/issues/new?template=cli.yml&cli-version=3.1.2&node-version=${encodeURIComponent(process.version)}`;

describe('CLI feedback issue form', () => {
  const template = parseDocument(
    readFileSync(new URL('../../../.github/ISSUE_TEMPLATE/cli.yml', import.meta.url), 'utf8')
  );

  it('uses text inputs for URL-prefilled fields', () => {
    expect(template.errors).toEqual([]);
    const fields = template.get('body', true);
    if (!isSeq(fields)) {
      throw new Error('Expected issue form fields');
    }
    for (const id of ['cli-version', 'node-version']) {
      const field = fields.items.find((item) => isMap(item) && item.get('id') === id);
      expect(isMap(field) && field.get('type')).toBe('input');
    }
  });
});

describe('teams feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentVersion).mockReturnValue('3.1.2');
    feedbackCommand.setOptionValue('json', false);
    vi.mocked(isInteractive).mockReturnValue(true);
    vi.mocked(isLocalSession).mockReturnValue(true);
    vi.mocked(openInBrowser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the CLI issue form and prints its URL locally', async () => {
    await feedbackCommand.parseAsync([], { from: 'user' });

    expect(openInBrowser).toHaveBeenCalledExactlyOnceWith(FEEDBACK_URL);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(FEEDBACK_URL));
    expect(outputJson).not.toHaveBeenCalled();
  });

  it('only prints the URL in a remote session', async () => {
    vi.mocked(isLocalSession).mockReturnValue(false);

    await feedbackCommand.parseAsync([], { from: 'user' });

    expect(openInBrowser).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(FEEDBACK_URL));
  });

  it('only prints the URL in a non-interactive session', async () => {
    vi.mocked(isInteractive).mockReturnValue(false);

    await feedbackCommand.parseAsync([], { from: 'user' });

    expect(openInBrowser).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(FEEDBACK_URL));
  });

  it('returns only the URL as JSON without opening a browser', async () => {
    await feedbackCommand.parseAsync(['--json'], { from: 'user' });

    expect(outputJson).toHaveBeenCalledExactlyOnceWith({ url: FEEDBACK_URL });
    expect(openInBrowser).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('prefills only versions, leaving dropdown selections to the form', async () => {
    vi.mocked(getCurrentVersion).mockReturnValue('3.1.2-preview.1+build.42');

    await feedbackCommand.parseAsync(['--json'], { from: 'user' });

    const output = vi.mocked(outputJson).mock.calls[0][0];
    expect(output).toEqual({ url: expect.any(String) });
    if (typeof output !== 'object' || output === null || !('url' in output) || typeof output.url !== 'string') {
      throw new Error('Expected feedback output with a URL');
    }
    const url = new URL(output.url);
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/microsoft/teams-sdk/issues/new');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      template: 'cli.yml',
      'cli-version': '3.1.2-preview.1+build.42',
      'node-version': process.version,
    });
  });

  it('reports browser failures without claiming an issue was submitted', async () => {
    vi.mocked(openInBrowser).mockRejectedValue(new Error('Browser launch failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    await expect(feedbackCommand.parseAsync([], { from: 'user' })).rejects.toThrow('process.exit');

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Browser launch failed'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(FEEDBACK_URL));
  });
});
