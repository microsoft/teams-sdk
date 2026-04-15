import pc from 'picocolors';
import { outputJson } from './json-output.js';
import { logger } from './logger.js';

export type ErrorCode =
  // Auth
  | 'AUTH_REQUIRED'
  | 'AUTH_TOKEN_FAILED'
  // Validation
  | 'VALIDATION_CONFLICT'
  | 'VALIDATION_MISSING'
  | 'VALIDATION_FORMAT'
  | 'INVALID_ICON'
  // Not found
  | 'NOT_FOUND_BOT'
  | 'NOT_FOUND_AAD'
  | 'NOT_FOUND_AZURE_BOT'
  | 'NOT_FOUND_APP'
  | 'NOT_FOUND_RESOURCE_GROUP'
  // API errors
  | 'API_ERROR'
  | 'API_ARM_ERROR'
  // Permission
  | 'PERMISSION_AZURE_REQUIRED'
  // Tool requirements
  | 'TOOL_AZ_NOT_INSTALLED'
  | 'TOOL_AZ_NOT_LOGGED_IN'
  // Catch-all
  | 'UNKNOWN';

/**
 * Structured CLI error with a machine-readable code and optional suggestion.
 * The `suggestion` field should be plain text (e.g., "teams login"),
 * NOT wrapped in picocolors — formatting is applied in handleError.
 */
export class CliError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * Format and output an error, then exit.
 * JSON mode: structured JSON to stdout.
 * Human mode: colored text (preserves existing behavior).
 */
export function handleError(error: unknown, json: boolean): never {
  if (error instanceof CliError) {
    if (json) {
      outputJson({
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.suggestion ? { suggestion: error.suggestion } : {}),
        },
      });
    } else {
      logger.error(pc.red(error.message));
      if (error.suggestion) {
        logger.error(error.suggestion);
      }
    }
  } else {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (json) {
      outputJson({
        ok: false,
        error: { code: 'UNKNOWN' as ErrorCode, message },
      });
    } else {
      logger.error(pc.red(message));
    }
  }
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFn = (...args: any[]) => Promise<void>;

/**
 * Wraps a Commander action handler with structured error handling.
 * Catches CliError and unknown errors, routes to JSON or human output.
 */
export function wrapAction<T extends ActionFn>(fn: T): T {
  const wrapped = async (...args: unknown[]) => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(0);
      }

      // Find options.json in Commander args
      let json = false;
      for (const arg of args) {
        if (arg && typeof arg === 'object' && 'json' in arg) {
          json = !!(arg as Record<string, unknown>).json;
          break;
        }
      }

      handleError(error, json);
    }
  };
  return wrapped as unknown as T;
}
