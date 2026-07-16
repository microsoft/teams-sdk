import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

/**
 * Set a nested value in a JSON file using dot-notation path.
 * Creates intermediate objects as needed. Passing `undefined` as value deletes the key.
 */
export function setJsonValue(filePath: string, dotPath: string, value?: unknown): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  setNestedValue(json, dotPath, value);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

/**
 * Set a nested value in a YAML file using dot-notation path.
 */
export function setYamlValue(filePath: string, dotPath: string, value?: unknown): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const obj = yaml.parse(content);
  setNestedValue(obj, dotPath, value);
  fs.writeFileSync(filePath, yaml.stringify(obj, { indent: 2 }) + '\n', 'utf8');
}

/**
 * Read a file, transform its content, and write it back.
 */
export function updateFile(filePath: string, transform: (content: string) => string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, transform(content), 'utf8');
}

/**
 * Set a key=value in a .env file. Creates the file if it doesn't exist.
 */
export function setEnvVar(filePath: string, key: string, value: string): void {
  const env: Record<string, string> = {};

  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        env[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
      }
    }
  } else {
    // Ensure parent dir exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  env[key] = value;
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

/**
 * Remove a key from a .env file.
 */
export function removeEnvVar(filePath: string, key: string): void {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      env[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
    }
  }

  delete env[key];
  const out = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
}

// --- internal helpers ---

type JsonObject = Record<string, unknown>;
type JsonArray = unknown[];
type JsonContainer = JsonObject | JsonArray;

function setNestedValue(obj: JsonObject, dotPath: string, value?: unknown): void {
  const parts = dotPath.split('.');
  let current: JsonContainer = obj;

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const isLast = i === parts.length - 1;

    if (Array.isArray(current)) {
      const index = parseArrayIndex(key, dotPath);
      if (isLast) {
        if (value === undefined) {
          current.splice(index, 1);
        } else {
          current[index] = value;
        }
      } else {
        const existing = current[index];
        if (!isJsonContainer(existing)) {
          current[index] = createContainer(parts[i + 1]);
        }
        current = current[index] as JsonContainer;
      }
      continue;
    }

    if (isLast) {
      if (value === undefined) {
        delete current[key];
      } else {
        current[key] = value;
      }
    } else {
      if (!isJsonContainer(current[key])) {
        current[key] = createContainer(parts[i + 1]);
      }
      current = current[key] as JsonContainer;
    }
  }
}

function isJsonContainer(value: unknown): value is JsonContainer {
  return typeof value === 'object' && value !== null;
}

function createContainer(nextKey: string): JsonContainer {
  return isArrayIndex(nextKey) ? [] : {};
}

function isArrayIndex(key: string): boolean {
  return /^(0|[1-9]\d*)$/.test(key);
}

function parseArrayIndex(key: string, dotPath: string): number {
  if (!isArrayIndex(key)) {
    throw new Error(`Expected array index in path "${dotPath}", got "${key}".`);
  }
  return Number(key);
}
