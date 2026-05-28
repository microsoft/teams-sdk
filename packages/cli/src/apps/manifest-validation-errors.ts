import type { DefinedError, ErrorObject } from 'ajv-draft-04/dist/index.js';

const supportedKeywords = [
  'additionalProperties',
  'enum',
  'required',
  'type',
  'maxLength',
  'minLength',
  'maxItems',
  'minItems',
  'format',
] as const satisfies readonly DefinedError['keyword'][];

type ManifestSchemaError = DefinedError & { keyword: (typeof supportedKeywords)[number] };

function stringifyValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function formatAllowedValues(values: unknown[]): string {
  return values.map((value) => stringifyValue(value)).join(', ');
}

function isError<TError extends ErrorObject>(
  error: ErrorObject,
  keywords: readonly TError['keyword'][]
): error is TError {
  return keywords.some((keyword) => keyword === error.keyword);
}

function isManifestSchemaError(error: ErrorObject): error is ManifestSchemaError {
  return isError<ManifestSchemaError>(error, supportedKeywords);
}

function formatUnhandledError(error: never): string {
  return `failed ${JSON.stringify(error)} validation`;
}

export function formatManifestSchemaErrorMessage(error: ErrorObject): string {
  if (!isManifestSchemaError(error)) {
    return error.message ?? `failed ${error.keyword} validation`;
  }

  switch (error.keyword) {
    case 'additionalProperties':
      return `unknown property ${JSON.stringify(error.params.additionalProperty)}`;

    case 'enum': {
      const valuePrefix =
        error.data !== undefined ? `${stringifyValue(error.data)} is not allowed. ` : '';
      return `${valuePrefix}Allowed values: ${formatAllowedValues(error.params.allowedValues)}`;
    }

    case 'required':
      return `missing required property ${JSON.stringify(error.params.missingProperty)}`;

    case 'type': {
      const expectedType = Array.isArray(error.params.type)
        ? error.params.type.join(' or ')
        : error.params.type;
      return `expected type ${expectedType}`;
    }

    case 'maxLength':
      return `must be ${error.params.limit} characters or fewer`;

    case 'minLength':
      return `must be at least ${error.params.limit} characters`;

    case 'maxItems':
      return `must contain ${error.params.limit} items or fewer`;

    case 'minItems':
      return `must contain at least ${error.params.limit} items`;

    case 'format':
      return `must match format ${JSON.stringify(error.params.format)}`;

    default: {
      const _exhaustive: never = error;
      return formatUnhandledError(_exhaustive);
    }
  }
}
