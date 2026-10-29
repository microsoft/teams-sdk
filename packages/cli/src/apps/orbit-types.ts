export type OrbitJsonValue = string | number | boolean | null | OrbitJsonValue[] | OrbitJsonObject;

// Preserve unmodeled manifest and first-party fields instead of rebuilding a lossy write payload.
export interface OrbitJsonObject {
  [key: string]: OrbitJsonValue | undefined;
}

export interface OrbitTextPair extends OrbitJsonObject {
  short?: string | null;
  full?: string | null;
}

export interface OrbitDeveloper extends OrbitJsonObject {
  name?: string | null;
  websiteUrl?: string | null;
  privacyUrl?: string | null;
  termsOfUseUrl?: string | null;
  mpnId?: string | null;
}

export interface OrbitIcons extends OrbitJsonObject {
  color?: string | null;
  outline?: string | null;
}

export interface OrbitWebApplicationInfo extends OrbitJsonObject {
  id?: string | null;
  resource?: string | null;
}

export interface OrbitBot extends OrbitJsonObject {
  botId: string;
  scopes?: string[] | null;
  messagingEndpoint?: string | null;
}

export interface OrbitRscPermission extends OrbitJsonObject {
  name: string;
  type: 'Application' | 'Delegated';
}

export interface OrbitPermissions extends OrbitJsonObject {
  resourceSpecific?: OrbitRscPermission[] | null;
}

export interface OrbitAuthorization extends OrbitJsonObject {
  permissions?: OrbitPermissions | null;
}

export interface OrbitApplicationManifest extends OrbitJsonObject {
  id: string;
  manifestVersion?: string | null;
  version?: string | null;
  name?: OrbitTextPair | null;
  description?: OrbitTextPair | null;
  developer?: OrbitDeveloper | null;
  icons?: OrbitIcons | null;
  accentColor?: string | null;
  webApplicationInfo?: OrbitWebApplicationInfo | null;
  validDomains?: string[] | null;
  bots?: OrbitBot[] | null;
  authorization?: OrbitAuthorization | null;
}

export interface OrbitAppDetails extends OrbitJsonObject {
  applicationManifest: OrbitApplicationManifest;
  firstPartySettings?: OrbitJsonObject | null;
}

export interface OrbitAppProfile extends OrbitJsonObject {
  appDetails: OrbitAppDetails;
  appAccessControl?: OrbitJsonObject | null;
  appMetadata?: OrbitJsonObject | null;
}

export interface OrbitAppResponse extends OrbitJsonObject {
  /** Orbit resource ID, not applicationManifest.id or a bot client ID. */
  appId: string;
  appProfile: OrbitAppProfile;
}

export interface OrbitAppSnapshot {
  app: OrbitAppResponse;
  /** Missing headers remain explicit; future writes must require a fresh ETag. */
  etag: string | undefined;
}
