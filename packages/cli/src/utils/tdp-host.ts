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
 * Base URL for the bot communication configuration API, or undefined when the
 * API is not available in the selected environment.
 * TODO(prod): set the prod path once TDP ships this API to prod.
 */
export const BOT_COMMUNICATION_BASE_URL: string | undefined = isDevApiEnabled()
  ? `${DEV_INT_TDP_HOST}/cosmictestamer`
  : undefined;
