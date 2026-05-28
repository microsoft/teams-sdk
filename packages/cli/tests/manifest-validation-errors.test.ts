import { describe, expect, it } from 'vitest';
import type { ErrorObject } from 'ajv-draft-04/dist/index.js';
import { formatManifestSchemaErrorMessage } from '../src/apps/manifest-validation-errors.js';

describe('formatManifestSchemaErrorMessage', () => {
  it('formats additional property errors', () => {
    const error = {
      keyword: 'additionalProperties',
      instancePath: '/bots/0',
      schemaPath: '#/properties/bots/items/additionalProperties',
      params: { additionalProperty: 'supportsTargetedMessage' },
      message: 'must NOT have additional properties',
    } satisfies ErrorObject;

    const message = formatManifestSchemaErrorMessage(error);

    expect(message).toBe('unknown property "supportsTargetedMessage"');
  });

  it('formats enum errors with invalid value and allowed values', () => {
    const error = {
      keyword: 'enum',
      instancePath: '/bots/0/scopes/2',
      schemaPath: '#/properties/bots/items/properties/scopes/items/enum',
      params: { allowedValues: ['personal', 'team', 'groupChat'] },
      message: 'must be equal to one of the allowed values',
      data: 'groupchat',
    } satisfies ErrorObject & { data: unknown };

    expect(formatManifestSchemaErrorMessage(error)).toBe(
      '"groupchat" is not allowed. Allowed values: "personal", "team", "groupChat"'
    );
  });

  it('formats required, type, limit, and format errors', () => {
    expect(
      formatManifestSchemaErrorMessage({
        keyword: 'required',
        instancePath: '',
        schemaPath: '#/required',
        params: { missingProperty: 'icons' },
      })
    ).toBe('missing required property "icons"');

    expect(
      formatManifestSchemaErrorMessage({
        keyword: 'type',
        instancePath: '/bots',
        schemaPath: '#/properties/bots/type',
        params: { type: 'array' },
      })
    ).toBe('expected type array');

    expect(
      formatManifestSchemaErrorMessage({
        keyword: 'maxLength',
        instancePath: '/name/short',
        schemaPath: '#/properties/name/properties/short/maxLength',
        params: { limit: 30 },
      })
    ).toBe('must be 30 characters or fewer');

    expect(
      formatManifestSchemaErrorMessage({
        keyword: 'format',
        instancePath: '/developer/websiteUrl',
        schemaPath: '#/properties/developer/properties/websiteUrl/format',
        params: { format: 'uri' },
      })
    ).toBe('must match format "uri"');
  });
});
