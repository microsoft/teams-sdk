import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
const USER_AGENT = `teams-cli/${version}`;

export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', USER_AGENT);
  headers.set('Client-Source', USER_AGENT);
  return fetch(url, { ...init, headers });
}
