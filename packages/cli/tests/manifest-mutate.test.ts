// RED/GREEN: manifest update MVP mutation behavior.

import { describe, expect, it } from 'vitest';
import { applyManifestMutations } from '../src/apps/manifest-mutate.js';

interface TestManifest {
  name?: { short?: string };
  validDomains?: string[];
  webApplicationInfo?: { id: string; resource: string };
  showLoadingIndicator?: boolean;
}

describe('applyManifestMutations', () => {
  it('sets JSON values and records added/updated changes', () => {
    const manifest: TestManifest = { name: { short: 'Old' } };

    const changes = applyManifestMutations(manifest, {
      setJson: ['name.short="New"', 'webApplicationInfo.id="client-id"'],
    });

    expect(manifest.name?.short).toBe('New');
    expect(manifest.webApplicationInfo?.id).toBe('client-id');
    expect(changes).toEqual([
      { kind: 'updated', path: 'name.short', oldValue: 'Old', newValue: 'New' },
      { kind: 'added', path: 'webApplicationInfo.id', newValue: 'client-id' },
    ]);
  });

  it('sets parsed JSON values', () => {
    const manifest: TestManifest = {};

    const changes = applyManifestMutations(manifest, {
      setJson: ['validDomains=["contoso.com"]', 'showLoadingIndicator=true'],
    });

    expect(manifest.validDomains).toEqual(['contoso.com']);
    expect(manifest.showLoadingIndicator).toBe(true);
    expect(changes.map((change) => change.path)).toEqual(['validDomains', 'showLoadingIndicator']);
  });

  it('removes object fields and array indexes without leaving sparse arrays', () => {
    const manifest: TestManifest = {
      validDomains: ['a.example.com', 'b.example.com', 'c.example.com'],
      webApplicationInfo: { id: 'client-id', resource: 'api://client-id' },
    };

    const changes = applyManifestMutations(manifest, {
      remove: ['validDomains[1]', 'webApplicationInfo'],
    });

    expect(manifest.validDomains).toEqual(['a.example.com', 'c.example.com']);
    expect(Object.keys(manifest.validDomains!)).toEqual(['0', '1']);
    expect(manifest.webApplicationInfo).toBeUndefined();
    expect(changes).toEqual([
      { kind: 'removed', path: 'validDomains[1]', oldValue: 'b.example.com' },
      {
        kind: 'removed',
        path: 'webApplicationInfo',
        oldValue: { id: 'client-id', resource: 'api://client-id' },
      },
    ]);
  });

  it('rejects missing remove paths and invalid JSON values', () => {
    expect(() => applyManifestMutations({}, { remove: ['missing.path'] })).toThrow(
      'Path does not exist: missing.path'
    );

    expect(() => applyManifestMutations({}, { setJson: ['foo={not json}'] })).toThrow(
      'Invalid JSON for foo'
    );
  });
});
