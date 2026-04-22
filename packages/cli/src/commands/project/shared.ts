export interface ProjectNewOutput {
  name: string;
  language: string;
  template: string;
  path: string;
}

/**
 * Normalize a package/project name for TypeScript or Python.
 */
export function normalizePackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

/**
 * Gather environment variables from CLI options and process.env.
 */
export function gatherEnvVars(opts: {
  clientId?: string;
  clientSecret?: string;
}): Record<string, string> {
  const envVars: Record<string, string> = {};
  const clientId = opts.clientId ?? process.env.CLIENT_ID;
  const clientSecret = opts.clientSecret ?? process.env.CLIENT_SECRET;
  if (clientId) envVars.CLIENT_ID = clientId;
  if (clientSecret) envVars.CLIENT_SECRET = clientSecret;
  if (process.env.OPENAI_API_KEY) envVars.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (process.env.AZURE_OPENAI_API_KEY)
    envVars.AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
  if (process.env.AZURE_OPENAI_ENDPOINT)
    envVars.AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  return envVars;
}
