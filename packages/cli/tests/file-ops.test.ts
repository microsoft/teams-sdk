import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setJsonValue } from '../src/project/file-ops.js';

interface AzureAdConfig {
  ClientCredentials: {
    SourceType?: string;
    ClientSecret?: string;
  }[];
}

interface AppSettings {
  AzureAd: AzureAdConfig;
}

describe('file ops', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'teams-cli-file-ops-')));
    filePath = path.join(tempDir, 'appsettings.json');
    fs.writeFileSync(filePath, '{}\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates arrays for numeric JSON path segments', () => {
    setJsonValue(filePath, 'AzureAd.ClientCredentials.0.SourceType', 'ClientSecret');
    setJsonValue(filePath, 'AzureAd.ClientCredentials.0.ClientSecret', 'secret');

    const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as AppSettings;
    expect(json.AzureAd.ClientCredentials).toEqual([
      {
        SourceType: 'ClientSecret',
        ClientSecret: 'secret',
      },
    ]);
  });
});
