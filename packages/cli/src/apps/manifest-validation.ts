import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ErrorObject, Options, ValidateFunction } from 'ajv-draft-04/dist/index.js';
import { paths } from '../auth/config.js';
import { apiFetch } from '../utils/http.js';
import { formatManifestSchemaErrorMessage } from './manifest-validation-errors.js';

export interface ManifestValidationIssue {
  path: string;
  message: string;
  keyword?: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  issues: ManifestValidationIssue[];
}

export interface ManifestSchemaValidationOptions {
  cacheDir?: string;
}

interface ManifestSchemaCarrier {
  $schema?: unknown;
  manifestVersion?: unknown;
}

interface AjvDraft04Instance {
  compile(schema: object): ValidateFunction;
}

type AjvDraft04Constructor = new (opts?: Options) => AjvDraft04Instance;
type AddFormats = (ajv: AjvDraft04Instance) => void;

const require = createRequire(import.meta.url);
const AjvDraft04 = require('ajv-draft-04') as AjvDraft04Constructor;
const addFormats = require('ajv-formats') as AddFormats;

const validators = new Map<string, ValidateFunction>();
const ALLOWED_SCHEMA_HOSTS = new Set(['developer.microsoft.com']);

export function clearManifestSchemaValidationCache(): void {
  validators.clear();
}

function getDefaultSchemaUrl(manifestVersion: string): string {
  return `https://developer.microsoft.com/json-schemas/teams/v${manifestVersion}/MicrosoftTeams.schema.json`;
}

function getSchemaUrl(manifest: ManifestSchemaCarrier): string | undefined {
  if (typeof manifest.$schema === 'string' && /^https?:\/\//i.test(manifest.$schema)) {
    return manifest.$schema;
  }

  if (typeof manifest.manifestVersion === 'string' && manifest.manifestVersion.trim()) {
    return getDefaultSchemaUrl(manifest.manifestVersion.trim());
  }

  return undefined;
}

function validateSchemaUrl(schemaUrl: string): ManifestValidationIssue | undefined {
  let parsed: URL;
  try {
    parsed = new URL(schemaUrl);
  } catch {
    return {
      path: '$schema',
      message: `Manifest schema URL is invalid: ${schemaUrl}`,
      keyword: 'schemaUrl',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      path: '$schema',
      message: `Manifest schema URL must use HTTPS and be hosted by Microsoft: ${schemaUrl}`,
      keyword: 'schemaUrlHost',
    };
  }

  if (!ALLOWED_SCHEMA_HOSTS.has(parsed.hostname.toLowerCase())) {
    return {
      path: '$schema',
      message: `Manifest schema URL must be hosted by Microsoft (${Array.from(ALLOWED_SCHEMA_HOSTS).join(', ')}): ${schemaUrl}`,
      keyword: 'schemaUrlHost',
    };
  }

  return undefined;
}

function getSchemaCachePath(schemaUrl: string, cacheDir: string): string {
  const hash = createHash('sha256').update(schemaUrl).digest('hex').slice(0, 16);
  return join(cacheDir, 'manifest-schemas', `${hash}.schema.json`);
}

async function readCachedSchema(schemaUrl: string, cacheDir: string): Promise<object | undefined> {
  try {
    const schemaPath = getSchemaCachePath(schemaUrl, cacheDir);
    const raw = await readFile(schemaPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Cache misses/corruption are handled by fetching a fresh schema.
  }

  return undefined;
}

async function writeCachedSchema(schemaUrl: string, cacheDir: string, schema: object): Promise<void> {
  const schemaPath = getSchemaCachePath(schemaUrl, cacheDir);
  await mkdir(join(cacheDir, 'manifest-schemas'), { recursive: true });
  await writeFile(schemaPath, JSON.stringify(schema, null, 2));
}

async function fetchSchema(schemaUrl: string): Promise<object> {
  const response = await apiFetch(schemaUrl);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const schema: unknown = await response.json();
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    throw new Error('schema response was not a JSON object');
  }

  return schema;
}

async function getSchema(schemaUrl: string, cacheDir: string): Promise<object> {
  const cached = await readCachedSchema(schemaUrl, cacheDir);
  if (cached) return cached;

  const schema = await fetchSchema(schemaUrl);
  try {
    await writeCachedSchema(schemaUrl, cacheDir, schema);
  } catch {
    // Cache writes are best-effort. Validation should still work when the cache directory
    // is unavailable, matching the CLI's other cache usage patterns.
  }
  return schema;
}

function compileValidator(schemaUrl: string, schema: object): ValidateFunction {
  const ajv = new AjvDraft04({ allErrors: true, strict: false, verbose: true });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  validators.set(schemaUrl, validator);
  return validator;
}

async function getValidator(schemaUrl: string, cacheDir: string): Promise<ValidateFunction> {
  const cachedValidator = validators.get(schemaUrl);
  if (cachedValidator) return cachedValidator;

  const schema = await getSchema(schemaUrl, cacheDir);
  return compileValidator(schemaUrl, schema);
}

function normalizePath(error: ErrorObject): string {
  const instancePath = 'instancePath' in error ? error.instancePath : '';
  if (instancePath) {
    return instancePath
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
      .join('.');
  }

  const dataPath = 'dataPath' in error ? String(error.dataPath) : '';
  return dataPath.replace(/^\./, '').replace(/\[(\d+)\]/g, '.$1');
}


export async function validateTeamsManifestSchema(
  manifest: unknown,
  options: ManifestSchemaValidationOptions = {}
): Promise<ManifestValidationResult> {
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    return {
      valid: false,
      issues: [{ path: '', message: 'Manifest must be a JSON object.', keyword: 'type' }],
    };
  }

  const schemaUrl = getSchemaUrl(manifest as ManifestSchemaCarrier);
  if (!schemaUrl) {
    return {
      valid: false,
      issues: [
        {
          path: '$schema',
          message: 'Manifest must include a valid $schema URL or manifestVersion.',
          keyword: 'schemaUrl',
        },
      ],
    };
  }

  const schemaUrlIssue = validateSchemaUrl(schemaUrl);
  if (schemaUrlIssue) {
    return { valid: false, issues: [schemaUrlIssue] };
  }

  const cacheDir = options.cacheDir ?? paths.cache;
  let validate: ValidateFunction;
  try {
    validate = await getValidator(schemaUrl, cacheDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      issues: [
        {
          path: '$schema',
          message: `Failed to fetch manifest schema from ${schemaUrl}: ${message}`,
          keyword: 'schemaFetch',
        },
      ],
    };
  }

  const valid = validate(manifest);
  if (valid) {
    return { valid: true, issues: [] };
  }

  return {
    valid: false,
    issues: (validate.errors ?? []).map((error) => ({
      path: normalizePath(error),
      message: formatManifestSchemaErrorMessage(error),
      keyword: error.keyword,
    })),
  };
}

export function formatManifestValidationIssues(issues: ManifestValidationIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path || '(root)';
      return `  ${path}: ${issue.message}`;
    })
    .join('\n');
}
