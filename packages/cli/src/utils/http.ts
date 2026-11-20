import { createRequire } from 'node:module';
import { getCancellationSignal } from './cancellation.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
const USER_AGENT = `teams-cli/${version}`;

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const signal = getCancellationSignal();
  signal?.throwIfAborted();
  const headers = new Headers(init?.headers);
  headers.set('User-Agent', USER_AGENT);
  headers.set('Client-Source', USER_AGENT);
  const response = await fetch(url, {
    ...init,
    headers,
    ...(signal ? { signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal } : {}),
  });
  signal?.throwIfAborted();
  return response;
}
