import { describe, it, expect } from 'vitest';
import { validateEndpoint } from '../src/apps/manifest.js';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

interface JsonErrorResponse {
  ok: false;
  error: {
    code: string;
    message?: string;
  };
}

function runJson(command: string): { data: JsonErrorResponse; exitCode: number } {
  try {
    const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return { data: JSON.parse(stdout) as JsonErrorResponse, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; status?: number };
    return {
      data: JSON.parse(execError.stdout ?? '{}') as JsonErrorResponse,
      exitCode: execError.status ?? 1,
    };
  }
}

describe('validateEndpoint()', () => {
  it('accepts valid HTTPS URL', () => {
    expect(validateEndpoint('https://example.com/api/messages')).toBeNull();
  });

  it('accepts localhost for dev', () => {
    expect(validateEndpoint('https://localhost:3978/api/messages')).toBeNull();
  });

  it('accepts 127.0.0.1 for dev', () => {
    expect(validateEndpoint('https://127.0.0.1:3978/api/messages')).toBeNull();
  });

  it('rejects HTTP', () => {
    expect(validateEndpoint('http://example.com/api/messages')).toBe('Endpoint must use HTTPS.');
  });

  it('rejects malformed URL', () => {
    expect(validateEndpoint('not-a-url')).toBe('Endpoint is not a valid URL.');
  });

  it('rejects placeholder URL', () => {
    expect(validateEndpoint('https://<your-tunnel-url>/api/messages')).toBe(
      'Endpoint is not a valid URL.'
    );
  });

  it('rejects FTP protocol', () => {
    expect(validateEndpoint('ftp://example.com/api')).toBe('Endpoint must use HTTPS.');
  });
});

describe('app update --endpoint validation (offline)', () => {
  it('rejects non-HTTPS endpoint in JSON mode', () => {
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --endpoint "ftp://bad.com" --json`
    );
    expect(exitCode).toBe(1);
    expect(data.error.code).toBe('VALIDATION_FORMAT');
    expect(data.error.message).toContain('HTTPS');
  });

  it('rejects malformed endpoint in JSON mode', () => {
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --endpoint "not-a-url" --json`
    );
    expect(exitCode).toBe(1);
    expect(data.error.code).toBe('VALIDATION_FORMAT');
    expect(data.error.message).toContain('not a valid URL');
  });

  it('rejects empty endpoint in JSON mode', () => {
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --endpoint "" --json`
    );
    expect(exitCode).toBe(1);
    expect(data.error.code).toBe('VALIDATION_FORMAT');
    expect(data.error.message).toContain('cannot be empty');
  });
});
