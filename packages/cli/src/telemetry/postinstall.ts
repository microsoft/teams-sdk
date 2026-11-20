import { randomUUID } from 'node:crypto';
import type { LoggerProvider, LogRecordExporter } from '@opentelemetry/sdk-logs';
import { TelemetryState, type EnrollmentSession } from './state.js';
import type { PostinstallAttributes } from './contract.js';
import { AppInsightsLogExporter, parseConnectionString } from './exporter.js';
import {
  TELEMETRY_CONNECTION_STRING,
  TELEMETRY_FLUSH_MS,
  TELEMETRY_RELEASE_ENABLED,
} from './config.js';

export interface PostinstallOptions {
  version: string;
  state?: TelemetryState;
  env?: NodeJS.ProcessEnv;
  enabled?: boolean;
  exporter?: () => LogRecordExporter;
}

export async function sendPostinstall(options: PostinstallOptions): Promise<void> {
  const env = options.env ?? process.env;
  if (
    !(options.enabled ?? TELEMETRY_RELEASE_ENABLED) ||
    env.DO_NOT_TRACK === '1' ||
    env.TEAMS_CLI_TELEMETRY_OPTOUT === '1'
  )
    return;
  const state = options.state ?? new TelemetryState();
  const deadline = Date.now() + TELEMETRY_FLUSH_MS;
  let accepting = true;
  let session: EnrollmentSession | undefined;
  let exporter: LogRecordExporter | undefined;
  let provider: LoggerProvider | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const active = (): boolean =>
    accepting && env.DO_NOT_TRACK !== '1' && env.TEAMS_CLI_TELEMETRY_OPTOUT !== '1';
  const allowed = async (): Promise<boolean> =>
    active() && !!session && (await state.isCurrent(session)) && active();
  try {
    await Promise.race([
      (async (): Promise<void> => {
        if ((await state.enrollment()) !== 'on' || !active()) return;
        const destination = parseConnectionString(
          env.TEAMS_CLI_TELEMETRY_CONNECTION_STRING ?? TELEMETRY_CONNECTION_STRING
        );
        if (!options.exporter && !destination) return;
        const { LoggerProvider, BatchLogRecordProcessor } = await import('@opentelemetry/sdk-logs');
        if (!active()) return;
        exporter =
          options.exporter?.() ??
          new AppInsightsLogExporter(destination!, allowed, TELEMETRY_FLUSH_MS);
        if (exporter instanceof AppInsightsLogExporter) exporter.setDeadline(deadline);
        const guarded: LogRecordExporter = {
          export(records, callback): void {
            void allowed()
              .then((enabled) => {
                if (enabled && active()) exporter!.export(records, callback);
                else callback({ code: 0 });
              })
              .catch(() => callback({ code: 0 }));
          },
          shutdown: () => exporter!.shutdown(),
        };
        provider = new LoggerProvider({
          processors: [
            new BatchLogRecordProcessor(guarded, {
              maxQueueSize: 16,
              maxExportBatchSize: 16,
              scheduledDelayMillis: 30_000,
              exportTimeoutMillis: TELEMETRY_FLUSH_MS,
            }),
          ],
        });
        session = await state.begin(active);
        if (!session || !(await allowed())) return;
        const attributes: PostinstallAttributes = {
          schemaVersion: 1,
          cliVersion: options.version,
          os: process.platform,
          installationId: session.installationId,
          invocationId: randomUUID(),
          timestamp: new Date().toISOString(),
        };
        provider.getLogger('teams-cli', options.version).emit({
          body: 'teams.cli.postinstall',
          attributes: { ...attributes },
        });
        await provider.forceFlush();
      })(),
      new Promise<void>((done) => {
        timer = setTimeout(done, TELEMETRY_FLUSH_MS);
      }),
    ]);
  } catch {
    /* Installation must succeed even when consent storage or export fails. */
  } finally {
    accepting = false;
    clearTimeout(timer);
    if (exporter instanceof AppInsightsLogExporter) exporter.abort();
    void provider?.shutdown().catch(() => undefined);
  }
}
