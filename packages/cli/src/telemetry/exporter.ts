import { request as httpRequest, type ClientRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { isGuid } from './contract.js';

interface Destination {
  endpoint: URL;
  instrumentationKey: string;
}

interface LogEnvelope {
  name: string;
  time: string;
  iKey: string;
  tags: { 'ai.cloud.role': string; 'ai.cloud.roleInstance': string };
  data: {
    baseType: 'MessageData';
    baseData: { ver: number; message: string; properties: { [key: string]: string } };
  };
}

export function parseConnectionString(connectionString: string): Destination | undefined {
  const entries = new Map(
    connectionString.split(';').map((part) => {
      const equals = part.indexOf('=');
      return [part.slice(0, equals).trim().toLowerCase(), part.slice(equals + 1).trim()];
    })
  );
  const instrumentationKey = entries.get('instrumentationkey');
  const ingestionEndpoint = entries.get('ingestionendpoint');
  if (!isGuid(instrumentationKey) || !ingestionEndpoint) return undefined;
  try {
    const endpoint = new URL(ingestionEndpoint);
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      (endpoint.port && endpoint.port !== '443')
    )
      return undefined;
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/v2.1/track`;
    return { endpoint, instrumentationKey };
  } catch {
    return undefined;
  }
}

/** Private candidate sender; no retries, offline storage, globals or automatic instrumentation. */
export class AppInsightsLogExporter implements LogRecordExporter {
  private readonly pending = new Map<ClientRequest, () => void>();
  private stopped = false;
  private deadline: number | undefined;

  constructor(
    private readonly destination: Destination,
    private readonly allowed: () => Promise<boolean>,
    private readonly timeoutMs: number
  ) {}

  setDeadline(deadline: number): void {
    this.deadline = deadline;
  }

  export(records: ReadableLogRecord[], callback: Parameters<LogRecordExporter['export']>[1]): void {
    void this.send(records).then(
      () => callback({ code: 0 }),
      () => callback({ code: 1 })
    );
  }

  private async send(records: ReadableLogRecord[]): Promise<void> {
    if (this.stopped || !(await this.allowed()) || this.stopped) return;
    const timeout = Math.min(this.timeoutMs, (this.deadline ?? Infinity) - Date.now());
    if (timeout <= 0) return;
    const envelopes: LogEnvelope[] = records.map((record) => {
      const properties: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(record.attributes)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
          properties[key] = String(value);
      }
      return {
        name: 'Microsoft.ApplicationInsights.Message',
        time: new Date(record.hrTime[0] * 1000 + record.hrTime[1] / 1e6).toISOString(),
        iKey: this.destination.instrumentationKey,
        tags: { 'ai.cloud.role': 'teams-cli', 'ai.cloud.roleInstance': 'teams-cli' },
        data: {
          baseType: 'MessageData',
          baseData: { ver: 2, message: String(record.body), properties },
        },
      };
    });
    const body = JSON.stringify(envelopes);
    await new Promise<void>((resolve) => {
      const request = this.destination.endpoint.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = request(this.destination.endpoint, {
        method: 'POST',
        agent: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Connection: 'close',
        },
      });
      let settled = false;
      const settle = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pending.delete(req);
        req.destroy();
        resolve();
      };
      const timer = setTimeout(settle, timeout);
      this.pending.set(req, settle);
      req.on('error', settle);
      req.on('close', settle);
      req.on('response', (response) => {
        response.on('error', settle);
        response.resume();
        settle();
      });
      req.end(body);
    });
  }

  abort(): void {
    this.stopped = true;
    for (const settle of this.pending.values()) settle();
  }

  async shutdown(): Promise<void> {
    this.abort();
  }
}
