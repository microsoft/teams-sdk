import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { AppInsightsLogExporter, parseConnectionString } from '../src/telemetry/exporter.js';

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => done());
        })
    )
  );
});

describe('postinstall sender', () => {
  it('sends an Application Insights trace without host identity or retries', async () => {
    const requests: string[] = [];
    const server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on('end', () => {
        requests.push(body);
        response.writeHead(206).end();
      });
    });
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture address');
    const exporter = new AppInsightsLogExporter(
      {
        endpoint: new URL(`http://127.0.0.1:${address.port}/v2.1/track`),
        instrumentationKey: '11111111-1111-4111-8111-111111111111',
      },
      async () => true,
      200
    );
    const provider = new LoggerProvider({ processors: [new BatchLogRecordProcessor(exporter)] });
    provider
      .getLogger('test')
      .emit({ body: 'teams.cli.postinstall', attributes: { cliVersion: 'test' } });
    await provider.forceFlush();
    await provider.shutdown();
    expect(requests).toHaveLength(1);
    expect(JSON.parse(requests[0])).toMatchObject([
      {
        tags: { 'ai.cloud.role': 'teams-cli', 'ai.cloud.roleInstance': 'teams-cli' },
        data: { baseType: 'MessageData', baseData: { message: 'teams.cli.postinstall' } },
      },
    ]);
  });

  it('disconnects a stalled request at the absolute deadline', async () => {
    let disconnected = false;
    const server = createServer((request) => {
      request.socket.on('close', () => {
        disconnected = true;
      });
      request.resume();
    });
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture address');
    const exporter = new AppInsightsLogExporter(
      {
        endpoint: new URL(`http://127.0.0.1:${address.port}/v2.1/track`),
        instrumentationKey: '11111111-1111-4111-8111-111111111111',
      },
      async () => true,
      500
    );
    const provider = new LoggerProvider({ processors: [new BatchLogRecordProcessor(exporter)] });
    provider.getLogger('test').emit({ body: 'teams.cli.postinstall' });
    exporter.setDeadline(Date.now() + 80);
    const started = performance.now();
    await provider.forceFlush();
    await provider.shutdown();
    await new Promise<void>((done) => setTimeout(done, 20));
    expect(performance.now() - started).toBeLessThan(400);
    expect(disconnected).toBe(true);
  });

  it('requires a full HTTPS connection string without embedded credentials', () => {
    const key = 'InstrumentationKey=11111111-1111-4111-8111-111111111111';
    for (const suffix of [
      '',
      ';IngestionEndpoint=http://localhost',
      ';IngestionEndpoint=https://user:pass@example.com',
      ';IngestionEndpoint=https://example.com?private=true',
    ]) {
      expect(parseConnectionString(key + suffix)).toBeUndefined();
    }
    expect(
      parseConnectionString(`${key};IngestionEndpoint=https://example.com/`)?.endpoint.href
    ).toBe('https://example.com/v2.1/track');
  });
});
