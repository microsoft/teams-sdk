/**
 * Teams Developer Portal (TDP) host selection.
 *
 * Setting TEAMS_DEV_API=1 points every TDP call at the dev-int environment
 * and enables APIs that are only deployed there (e.g. bot communication
 * configuration / socket mode). Read once at startup.
 */

const PROD_TDP_HOST = 'https://dev.teams.microsoft.com';
const DEV_INT_TDP_HOST = 'https://dev-int.teams.microsoft.com';

export const DEV_API_ENV_VAR = 'TEAMS_DEV_API';

export function isDevApiEnabled(): boolean {
  return process.env[DEV_API_ENV_VAR] === '1';
}

export const TDP_HOST = isDevApiEnabled() ? DEV_INT_TDP_HOST : PROD_TDP_HOST;

export const TDP_BASE_URL = `${TDP_HOST}/api`;

/**
 * Whether TDP v2 API features (AAD app creation, bot communication
 * configuration) can be used. Only dev-int for now.
 * TODO(prod): enable as each TDP v2 endpoint ships to prod.
 */
export function isTdpV2Enabled(): boolean {
  return isDevApiEnabled();
}

/** Base URL for the TDP v2 API. Routes are rooted at `/v1.0/...`. */
export const TDP_V2_BASE_URL = `${TDP_HOST}/${isDevApiEnabled() ? 'cosmictestamer' : 'cosmicprodamer'}`;
