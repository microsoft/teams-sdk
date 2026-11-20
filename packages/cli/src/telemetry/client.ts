import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Logger } from '@opentelemetry/api-logs';
import type { LoggerProvider, LogRecordExporter } from '@opentelemetry/sdk-logs';
import { throwIfCancelled } from '../utils/cancellation.js';
import {
  failureCategory,
  safeFacts,
  type AttemptOrigin,
  type EventAttributes,
  type EventName,
  type RegistrationFacts,
  type OperationFacts,
  type OperationName,
  type Outcome,
} from './contract.js';
import { TelemetryState, type Attempt, type CliEnrollmentSession } from './state.js';
import {
  TELEMETRY_CONNECTION_STRING,
  TELEMETRY_FLUSH_MS,
  TELEMETRY_RELEASE_ENABLED,
} from './config.js';

export interface TelemetryOptions {
  state?: TelemetryState;
  version: string;
  enabled?: boolean;
  env?: NodeJS.ProcessEnv;
  exporter?: () => LogRecordExporter;
}

export interface AttemptTarget {
  target: string;
  origin: AttemptOrigin;
  explicit?: boolean;
  defer?: boolean;
}

interface OperationContext {
  operation: TelemetryOperation;
  attempt: Attempt | undefined;
}

export class TelemetryOperation {
  readonly id: string;
  readonly startedAt = new Date().toISOString();
  private readonly start = performance.now();
  private finishing: Promise<void> | undefined;
  private starting: Promise<void> | undefined;

  constructor(
    readonly name: OperationName,
    private readonly emit: (name: EventName, attributes: Partial<EventAttributes>) => Promise<void>,
    private facts: OperationFacts,
    enabled: boolean,
    private readonly bind: (target: AttemptTarget) => Promise<void>
  ) {
    this.id = enabled ? randomUUID() : '';
  }

  update(facts: OperationFacts): void {
    this.facts = { ...this.facts, ...safeFacts(facts) };
  }

  async bindTarget(target: AttemptTarget): Promise<void> {
    await this.bind(target);
    await this.startObservation();
  }

  async startObservation(): Promise<void> {
    this.starting ??= this.emit('teams.cli.operation', {
      ...this.facts,
      operation: this.name,
      operationId: this.id,
      phase: 'started',
      startedAt: this.startedAt,
    });
    await this.starting;
  }

  link(facts: RegistrationFacts): void {
    this.update(facts);
    void this.emit('teams.cli.identity_link', {
      ...safeFacts(facts),
      operation: this.name,
      operationId: this.id,
      startedAt: this.startedAt,
    });
  }

  complete(outcome: Outcome = 'succeeded', error?: unknown): Promise<void> {
    this.finishing ??= this.finish(outcome, error);
    return this.finishing;
  }

  private async finish(outcome: Outcome, error: unknown): Promise<void> {
    await this.startObservation();
    await this.emit('teams.cli.operation', {
      ...this.facts,
      operation: this.name,
      operationId: this.id,
      phase: 'completed',
      startedAt: this.startedAt,
      durationMs: Math.max(0, Math.round(performance.now() - this.start)),
      outcome,
      ...(outcome === 'failed' ? { failureCategory: failureCategory(error) } : {}),
    });
  }

  async cancel(): Promise<void> {
    await this.complete('cancelled');
  }
}

export class TelemetryClient {
  private readonly context = new AsyncLocalStorage<OperationContext>();
  private readonly tasks = new Set<Promise<void>>();
  private readonly operations = new Set<TelemetryOperation>();
  private closed = false;
  private closing: Promise<void> | undefined;
  private firstUseStartedAt: string | undefined;

  constructor(
    private readonly state: TelemetryState,
    private readonly version: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly session?: CliEnrollmentSession,
    private readonly invocationId?: string,
    private readonly provider?: LoggerProvider,
    private readonly logger?: Logger,
    private readonly sender?: { abort(): void; setDeadline(deadline: number): void }
  ) {}

  private async allowed(): Promise<boolean> {
    return (
      !this.closed &&
      !!this.session &&
      this.env.DO_NOT_TRACK !== '1' &&
      this.env.TEAMS_CLI_TELEMETRY_OPTOUT !== '1' &&
      (await this.state.isCurrent(this.session)) &&
      !this.closed
    );
  }

  get enabled(): boolean {
    return !!this.session && !this.closed;
  }

  private emit(
    name: EventName,
    fields: Partial<EventAttributes>,
    attempt?: Attempt
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const task = (async (): Promise<void> => {
      if (!this.logger || !this.session || !this.invocationId || !(await this.allowed())) return;
      const attributes: EventAttributes = {
        schemaVersion: 1,
        cliVersion: this.version,
        os: process.platform,
        installationId: this.session.installationId,
        invocationId: this.invocationId,
        timestamp,
        ...(attempt
          ? {
              attemptId: attempt.id,
              attemptStartedAt: attempt.startedAt,
              attemptOrigin: attempt.origin,
            }
          : {}),
        ...fields,
      };
      this.logger.emit({ body: name, attributes: { ...attributes } });
    })().catch(() => undefined);
    this.tasks.add(task);
    void task.finally(() => this.tasks.delete(task));
    return task;
  }

  async start(): Promise<void> {
    if (this.session?.firstUse) {
      this.firstUseStartedAt = new Date().toISOString();
      await this.emit('teams.cli.first_use', {
        phase: 'started',
        startedAt: this.firstUseStartedAt,
      });
    }
  }

  async run<T>(
    name: OperationName,
    facts: OperationFacts,
    action: (operation: TelemetryOperation) => Promise<T>,
    target?: AttemptTarget
  ): Promise<T> {
    throwIfCancelled();
    const parent = this.context.getStore();
    if (parent?.operation.name === name) return action(parent.operation);
    let attempt = parent?.attempt;
    let operationContext: OperationContext | undefined;
    const bind = async (target: AttemptTarget): Promise<void> => {
      if (!(await this.allowed()) || target.defer) return;
      attempt = undefined;
      if (operationContext) operationContext.attempt = undefined;
      try {
        const known = await this.state.resolveAttempt(target.target);
        // A fresh scaffold target must not borrow a containing project's attempt.
        if (target.origin === 'project.create') {
          attempt = await this.state.attempt(target.target, target.origin, this.session);
        } else {
          const project =
            (await this.state.projectTarget(target.target)) ??
            (target.explicit ? target.target : undefined);
          attempt =
            known ??
            (project ? await this.state.attempt(project, target.origin, this.session) : undefined);
        }
        if (operationContext) operationContext.attempt = attempt;
      } catch {
        /* Correlation failure must not affect the action. */
      }
    };
    if (target) {
      if (target.defer) attempt = undefined;
      else await bind(target);
    } else if (!attempt && (await this.allowed())) {
      try {
        attempt = await this.state.resolveAttempt();
      } catch {
        /* Best effort only. */
      }
    }
    const operation = new TelemetryOperation(
      name,
      (event, fields) => this.emit(event, fields, attempt),
      safeFacts(facts),
      await this.allowed(),
      bind
    );
    operationContext = { operation, attempt };
    this.operations.add(operation);
    if (!target?.defer) await operation.startObservation();
    try {
      return await this.context.run(operationContext, async () => {
        try {
          throwIfCancelled();
          const value = await action(operation);
          throwIfCancelled();
          await operation.complete();
          return value;
        } catch (error) {
          await operation.complete(
            error instanceof Error &&
              (error.name === 'ExitPromptError' || error.name === 'AbortError')
              ? 'cancelled'
              : 'failed',
            error
          );
          throw error;
        }
      });
    } finally {
      this.operations.delete(operation);
    }
  }

  async flush(): Promise<void> {
    try {
      await Promise.all(this.tasks);
      await this.provider?.forceFlush();
    } catch {
      /* Best effort only. */
    }
  }

  abort(): void {
    this.closed = true;
    this.sender?.abort();
    void this.provider?.shutdown().catch(() => undefined);
  }

  close(outcome: Outcome = 'succeeded'): Promise<void> {
    this.closing ??= this.finish(outcome);
    return this.closing;
  }

  private async finish(outcome: Outcome): Promise<void> {
    if (this.closed) return;
    const deadline = Date.now() + TELEMETRY_FLUSH_MS;
    this.sender?.setDeadline(deadline);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (async () => {
          for (const operation of this.operations) await operation.complete(outcome);
          if (this.firstUseStartedAt) {
            await this.emit('teams.cli.first_use', {
              phase: 'completed',
              startedAt: this.firstUseStartedAt,
              outcome,
              durationMs: Math.max(0, Date.now() - Date.parse(this.firstUseStartedAt)),
            });
          }
          await this.flush();
          await this.provider?.shutdown();
        })(),
        new Promise<void>((done) => {
          timer = setTimeout(done, TELEMETRY_FLUSH_MS);
        }),
      ]);
    } catch {
      /* Telemetry cannot change process status. */
    } finally {
      clearTimeout(timer);
      this.abort();
    }
  }
}

export async function startTelemetry(options: TelemetryOptions): Promise<TelemetryClient> {
  const state = options.state ?? new TelemetryState();
  const env = options.env ?? process.env;
  const disabled = (): TelemetryClient => new TelemetryClient(state, options.version, env);
  if (
    !(options.enabled ?? TELEMETRY_RELEASE_ENABLED) ||
    env.DO_NOT_TRACK === '1' ||
    env.TEAMS_CLI_TELEMETRY_OPTOUT === '1' ||
    (await state.enrollment()) !== 'on'
  )
    return disabled();
  let exporter: LogRecordExporter | undefined;
  try {
    const { AppInsightsLogExporter, parseConnectionString } = await import('./exporter.js');
    let session: CliEnrollmentSession | undefined;
    let accepting = true;
    const allowed = async (): Promise<boolean> =>
      accepting &&
      !!session &&
      env.DO_NOT_TRACK !== '1' &&
      env.TEAMS_CLI_TELEMETRY_OPTOUT !== '1' &&
      (await state.isCurrent(session)) &&
      accepting;
    const destination = parseConnectionString(
      env.TEAMS_CLI_TELEMETRY_CONNECTION_STRING ?? TELEMETRY_CONNECTION_STRING
    );
    if (!options.exporter && !destination) return disabled();
    exporter =
      options.exporter?.() ?? new AppInsightsLogExporter(destination!, allowed, TELEMETRY_FLUSH_MS);
    const { LoggerProvider, BatchLogRecordProcessor } = await import('@opentelemetry/sdk-logs');
    // Re-check enrollment at export time, not just when records are buffered.
    const guarded: LogRecordExporter = {
      export(records, callback): void {
        void allowed()
          .then((enabled) => {
            if (enabled && accepting) exporter!.export(records, callback);
            else callback({ code: 0 });
          })
          .catch(() => callback({ code: 0 }));
      },
      shutdown: () => exporter!.shutdown(),
    };
    const provider = new LoggerProvider({
      processors: [
        new BatchLogRecordProcessor(guarded, {
          maxQueueSize: 256,
          maxExportBatchSize: 256,
          scheduledDelayMillis: 30_000,
          exportTimeoutMillis: TELEMETRY_FLUSH_MS,
        }),
      ],
    });
    session = await state.beginCli(
      () => accepting && env.DO_NOT_TRACK !== '1' && env.TEAMS_CLI_TELEMETRY_OPTOUT !== '1'
    );
    if (!session) {
      await provider.shutdown();
      return disabled();
    }
    const client = new TelemetryClient(
      state,
      options.version,
      env,
      session,
      randomUUID(),
      provider,
      provider.getLogger('teams-cli', options.version),
      {
        abort(): void {
          accepting = false;
          if (exporter instanceof AppInsightsLogExporter) exporter.abort();
        },
        setDeadline(deadline: number): void {
          if (exporter instanceof AppInsightsLogExporter) exporter.setDeadline(deadline);
        },
      }
    );
    await client.start();
    return client;
  } catch {
    await exporter?.shutdown().catch(() => undefined);
    return disabled();
  }
}

let active = new TelemetryClient(new TelemetryState(), '', process.env);

export function telemetry(): TelemetryClient {
  return active;
}
export function setTelemetry(client: TelemetryClient): void {
  active = client;
}
