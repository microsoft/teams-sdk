import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

interface JsonErrorResponse {
  ok: false;
  error: {
    code: string;
    message?: string;
    suggestion?: string;
  };
}

function run(command: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; status?: number };
    return {
      stdout: execError.stdout ?? '',
      exitCode: execError.status ?? 1,
    };
  }
}

function runJson(command: string): { data: JsonErrorResponse; exitCode: number } {
  const { stdout, exitCode } = run(command);
  return { data: JSON.parse(stdout) as JsonErrorResponse, exitCode };
}

describe('app update --web-app-info-resource validation (offline)', () => {
  it('rejects resource URI over 100 characters', () => {
    const longUri = 'api://' + 'a'.repeat(100);
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --web-app-info-resource "${longUri}" --json`
    );
    expect(exitCode).toBe(1);
    expect(data.error.code).toBe('VALIDATION_FORMAT');
    expect(data.error.message).toMatch(/100 characters/);
  });

  it('rejects resource URI without api:// prefix', () => {
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --web-app-info-resource "https://example.com" --json`
    );
    expect(exitCode).toBe(1);
    expect(data.error.code).toBe('VALIDATION_FORMAT');
    expect(data.error.message).toMatch(/api:\/\//);
  });

  it('accepts resource URI within limit (fails at auth, not validation)', () => {
    const uri = 'api://botid-00000000-0000-0000-0000-000000000001';
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --web-app-info-resource "${uri}" --json`
    );
    // Should fail at auth (not logged in), not at validation
    expect(exitCode).toBe(1);
    expect(data.error.code).not.toBe('VALIDATION_FORMAT');
  });

  it('accepts --web-app-info-id as a mutation flag for --json mode', () => {
    const { data, exitCode } = runJson(
      `${CLI} app update some-app-id --web-app-info-id "00000000-0000-0000-0000-000000000001" --json`
    );
    // Should fail at auth, not at "no mutation flags" validation
    expect(exitCode).toBe(1);
    expect(data.error.code).not.toBe('VALIDATION_MISSING');
  });
});
