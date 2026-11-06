import { describe, expect, it } from 'vitest';
import { findPermission, getPermissionsForScope } from '../src/apps/rsc-catalog.js';

describe('RSC catalog', () => {
  it.each([
    'OnlineMeeting.Read.Chat',
    'OnlineMeeting.ReadWrite.Chat',
    'OnlineMeetingArtifact.Read.Chat',
    'VirtualEvent.Read.Chat',
    'VirtualEventRegistration-Anon.ReadWrite.Chat',
  ])('offers %s as a Chat application permission', (name: string) => {
    const catalog = getPermissionsForScope('Chat');
    const matches = catalog.Application.filter((permission) => permission.name === name);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.displayName).toEqual(expect.any(String));
    expect(matches[0]?.displayName.length).toBeGreaterThan(0);
    expect(matches[0]?.description).toEqual(expect.any(String));
    expect(matches[0]?.description.length).toBeGreaterThan(0);
    expect(catalog.Delegated.some((permission) => permission.name === name)).toBe(false);
    expect(findPermission(name)).toEqual({
      ...matches[0],
      scope: 'Chat',
      type: 'Application',
    });
  });
});
