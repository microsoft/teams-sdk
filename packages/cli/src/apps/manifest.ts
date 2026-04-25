import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { staticsDir } from '../project/paths.js';

export type BotScope = 'personal' | 'team' | 'groupChat' | 'copilot';

export interface ManifestOptions {
  botId: string;
  botName: string;
  endpoint?: string;
  description?: { short: string; full?: string };
  scopes?: BotScope[];
  developer?: {
    name: string;
    websiteUrl: string;
    privacyUrl: string;
    termsOfUseUrl: string;
  };
  colorIconBuffer?: Buffer;
  outlineIconBuffer?: Buffer;
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Validates that an endpoint URL is a well-formed HTTPS URL.
 * Returns an error message string if invalid, or `null` if valid.
 */
export function validateEndpoint(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Endpoint is not a valid URL.';
  }
  if (parsed.protocol !== 'https:') {
    return 'Endpoint must use HTTPS.';
  }
  if (!parsed.hostname) {
    return 'Endpoint is missing a hostname.';
  }
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return null; // allow localhost for dev
  }
  // Reject placeholder/template URLs like <your-tunnel-url>
  if (parsed.hostname.includes('<') || parsed.hostname.includes('>')) {
    return 'Endpoint contains placeholder characters — replace with an actual URL.';
  }
  return null;
}

export interface Manifest {
  id: string;
  name: { short: string; full?: string };
  bots?: Array<{ botId: string; scopes: BotScope[] }>;
  [key: string]: unknown;
}

export function createManifest(options: ManifestOptions): object {
  const {
    botId,
    botName,
    endpoint,
    description,
    scopes = ['personal', 'team', 'groupChat'],
    developer,
  } = options;

  const validDomains: string[] = ['*.botframework.com'];
  if (endpoint) {
    const domain = extractDomain(endpoint);
    if (domain) validDomains.push(domain);
  }

  return {
    $schema:
      'https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json',
    manifestVersion: '1.25',
    version: '1.0.0',
    id: botId,
    developer: developer ?? {
      name: 'Developer',
      websiteUrl: 'https://www.example.com',
      privacyUrl: 'https://www.example.com/privacy',
      termsOfUseUrl: 'https://www.example.com/terms',
    },
    icons: {
      color: 'color.png',
      outline: 'outline.png',
    },
    name: {
      short: botName,
      full: botName,
    },
    description: {
      short: description?.short ?? botName,
      full: description?.full ?? description?.short ?? botName,
    },
    accentColor: '#FFFFFF',
    bots: [
      {
        botId: botId,
        scopes,
        supportsFiles: false,
        isNotificationOnly: false,
      },
    ],
    staticTabs: [
      { entityId: 'conversations', scopes: ['personal'] },
      { entityId: 'about', scopes: ['personal'] },
    ],
    permissions: [],
    validDomains,
    supportsChannelFeatures: 'tier1',
  };
}

function defaultIcon(name: string): Buffer {
  return fs.readFileSync(path.join(staticsDir, name));
}

export function createManifestZip(options: ManifestOptions): Buffer {
  const manifest = createManifest(options);
  const zip = new AdmZip();

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.addFile('color.png', options.colorIconBuffer ?? defaultIcon('color.png'));
  zip.addFile('outline.png', options.outlineIconBuffer ?? defaultIcon('outline.png'));

  return zip.toBuffer();
}
