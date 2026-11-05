import { stripVTControlCharacters } from 'node:util';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apps from '../src/apps/index.js';
import { getTokenSilent } from '../src/auth/index.js';
import { appDoctorCommand } from '../src/commands/app/doctor.js';
import { outputJson } from '../src/utils/json-output.js';
import { logger } from '../src/utils/logger.js';

vi.mock('../src/apps/index.js', () => ({
  fetchAppDetailsV2: vi.fn(),
  getAadAppByClientId: vi.fn(),
  getAadAppFull: vi.fn(),
  fetchBot: vi.fn().mockResolvedValue({ configuredChannels: ['msteams'] }),
  getBotLocation: vi.fn().mockResolvedValue('azure'),
  discoverAzureBot: vi.fn().mockResolvedValue({
    subscription: 'subscription',
    resourceGroup: 'resource-group',
    region: 'global',
    tenantId: 'tenant',
  }),
  extractDomain: vi.fn(),
  getBotCommunicationConfiguration: vi.fn(),
  isBotCommunicationApiAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/auth/index.js', () => ({
  getAccount: vi.fn().mockResolvedValue({ tenantId: 'tenant' }),
  getTokenSilent: vi.fn().mockResolvedValue('token'),
  teamsDevPortalScopes: ['tdp'],
  graphScopes: ['graph'],
}));

vi.mock('../src/utils/az.js', () => ({
  isAzInstalled: vi.fn().mockResolvedValue(true),
  isAzLoggedIn: vi.fn().mockResolvedValue(true),
  runAz: vi.fn().mockImplementation(async (args: string[]) =>
    args.includes('authsetting') ? [] : {}
  ),
}));

vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({
    start: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  }),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/utils/json-output.js', () => ({ outputJson: vi.fn() }));

async function expectDoctorLabels(textLabel: string, jsonLabel: string): Promise<void> {
  await appDoctorCommand.parseAsync(['app-id'], { from: 'user' });
  const text = stripVTControlCharacters(
    vi.mocked(logger.info).mock.calls.map(([message]) => String(message ?? '')).join('\n')
  );
  expect(text).toContain('Entra App');
  expect(text).toContain(textLabel);

  vi.mocked(logger.info).mockClear();
  await appDoctorCommand.parseAsync(['app-id', '--json'], { from: 'user' });
  expect(logger.info).not.toHaveBeenCalled();
  expect(outputJson).toHaveBeenCalledWith(expect.objectContaining({
    checks: expect.arrayContaining([
      expect.objectContaining({ category: 'AAD App', label: jsonLabel }),
    ]),
  }));
}

describe('app doctor text terminology and JSON compatibility', () => {
  it('maps every CLI-authored AAD result label and detail to Entra text', () => {
    const source = ts.createSourceFile(
      'doctor.ts',
      readFileSync(new URL('../src/commands/app/doctor.ts', import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    const mappings = new Map<string, Map<string, string>>();
    function collectMaps(node: ts.Node): void {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        ['TEXT_LABELS', 'TEXT_DETAILS'].includes(node.name.text) &&
        node.initializer &&
        ts.isNewExpression(node.initializer)
      ) {
        const entries = node.initializer.arguments?.[0];
        const mapping = new Map<string, string>();
        if (entries && ts.isArrayLiteralExpression(entries)) {
          for (const entry of entries.elements) {
            if (ts.isArrayLiteralExpression(entry)) {
              const [key, value] = entry.elements;
              if (key && value && ts.isStringLiteralLike(key) && ts.isStringLiteralLike(value)) {
                mapping.set(key.text, value.text);
              }
            }
          }
        }
        mappings.set(node.name.text, mapping);
      }
      ts.forEachChild(node, collectMaps);
    }
    collectMaps(source);
    expect([...mappings.keys()].sort()).toEqual(['TEXT_DETAILS', 'TEXT_LABELS']);

    function checkResultText(node: ts.Node): void {
      if (
        ts.isPropertyAssignment(node) &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
        ['label', 'detail'].includes(node.name.text) &&
        node.initializer.getText(source).includes('AAD')
      ) {
        expect(ts.isStringLiteralLike(node.initializer)).toBe(true);
        const text = ts.isStringLiteralLike(node.initializer) ? node.initializer.text : '';
        const mapping = mappings.get(node.name.text === 'label' ? 'TEXT_LABELS' : 'TEXT_DETAILS');
        expect(mapping?.has(text), `Missing text mapping for ${node.name.text}: ${text}`).toBe(true);
        expect(mapping?.get(text)).not.toContain('AAD');
        expect(mapping?.get(text)).toContain('Entra');
      }
      ts.forEachChild(node, checkResultText);
    }
    checkResultText(source);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    appDoctorCommand.setOptionValue('json', false);
    vi.mocked(getTokenSilent).mockResolvedValue('token');
    vi.mocked(apps.fetchAppDetailsV2).mockResolvedValue({
      teamsAppId: 'app-id',
      appId: 'client-id',
      shortName: 'Test App',
      longName: 'Test App',
      shortDescription: 'Test app',
      longDescription: 'Test app',
      version: '1.0.0',
      developerName: 'Test Developer',
      websiteUrl: 'https://example.com',
      privacyUrl: 'https://example.com/privacy',
      termsOfUseUrl: 'https://example.com/terms',
      manifestVersion: '1.25',
      mpnId: '',
      accentColor: '#FFFFFF',
      bots: [{ botId: 'client-id', scopes: ['personal'] }],
      webApplicationInfoId: 'client-id',
    });
    vi.mocked(apps.getAadAppByClientId).mockResolvedValue({
      id: 'object-id',
      appId: 'client-id',
      displayName: 'Test App',
    });
    vi.mocked(apps.getAadAppFull).mockResolvedValue({});
  });

  it('displays Entra when the app is found while preserving the AAD JSON label', async () => {
    await expectDoctorLabels('Entra app found', 'AAD app found');
  });

  it('displays Entra when the app is missing while preserving the AAD JSON label', async () => {
    vi.mocked(apps.getAadAppByClientId).mockRejectedValue(new Error('Graph lookup failed'));
    await expectDoctorLabels('Entra app not found', 'AAD app not found');
  });

  it('displays Entra when full details are unavailable while preserving the AAD JSON label', async () => {
    vi.mocked(apps.getAadAppFull).mockRejectedValue(new Error('Graph details failed'));
    await expectDoctorLabels(
      'Could not fetch full Entra app details',
      'Could not fetch full AAD app details'
    );
  });

  it('preserves the category and label when the Graph token is unavailable', async () => {
    vi.mocked(getTokenSilent).mockImplementation(async (scopes: string[]) =>
      scopes.includes('graph') ? null : 'token'
    );
    await expectDoctorLabels('Could not get Graph token', 'Could not get Graph token');
  });

  it('displays Entra for a missing OAuth connection while preserving the AAD JSON detail', async () => {
    await appDoctorCommand.parseAsync(['app-id'], { from: 'user' });
    expect(vi.mocked(logger.info).mock.calls.flat().join('\n')).toContain(
      'No Entra connection configured on Azure bot'
    );
    await appDoctorCommand.parseAsync(['app-id', '--json'], { from: 'user' });
    expect(outputJson).toHaveBeenCalledWith(expect.objectContaining({
      checks: expect.arrayContaining([expect.objectContaining({
        label: 'No OAuth connection found',
        detail: 'No AAD connection configured on Azure bot',
      })]),
    }));
  });

  it('preserves API error details verbatim in text and JSON', async () => {
    const detail = 'AADSTS700016: AAD application was not found';
    vi.mocked(apps.getAadAppFull).mockRejectedValue(new Error(detail));

    await appDoctorCommand.parseAsync(['app-id'], { from: 'user' });
    expect(vi.mocked(logger.info).mock.calls.flat().join('\n')).toContain(detail);

    await appDoctorCommand.parseAsync(['app-id', '--json'], { from: 'user' });
    expect(outputJson).toHaveBeenCalledWith(expect.objectContaining({
      checks: expect.arrayContaining([expect.objectContaining({ detail })]),
    }));
  });
});
