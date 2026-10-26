import { afterEach, describe, expect, it, vi } from 'vitest';

const infoLines: string[] = [];

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn((msg: string) => infoLines.push(msg)) },
}));

async function loadWithFlag(value: string | undefined) {
  if (value === undefined) delete process.env.TEAMS_DEV_API;
  else process.env.TEAMS_DEV_API = value;
  vi.resetModules();
  return import('../src/apps/links.js');
}

describe('printInstallInstructions', () => {
  const original = process.env.TEAMS_DEV_API;

  afterEach(() => {
    infoLines.length = 0;
    if (original === undefined) delete process.env.TEAMS_DEV_API;
    else process.env.TEAMS_DEV_API = original;
    vi.resetModules();
  });

  it('prints the install link in prod', async () => {
    const links = await loadWithFlag(undefined);

    expect(links.isInstallLinkSupported()).toBe(true);
    links.printInstallInstructions('app-id', 'https://install.test/app-id');

    expect(infoLines.join('\n')).toContain('https://install.test/app-id');
  });

  it('prints manual upload steps on dev-int', async () => {
    const links = await loadWithFlag('1');

    expect(links.isInstallLinkSupported()).toBe(false);
    links.printInstallInstructions('app-id', 'https://install.test/app-id');

    const output = infoLines.join('\n');
    expect(output).not.toContain('https://install.test/app-id');
    expect(output).toContain('teams app package download app-id');
    expect(output).toContain('Upload a custom app');
  });
});
