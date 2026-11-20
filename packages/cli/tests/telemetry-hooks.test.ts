import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { setTelemetry, startTelemetry, type TelemetryClient } from '../src/telemetry/client.js';
import { TelemetryState } from '../src/telemetry/state.js';
import type { ProjectLanguageStrategy } from '../src/commands/project/shared.js';
import { setCancellationSignal } from '../src/utils/cancellation.js';
import { isAutoConfirm, setAutoConfirm } from '../src/utils/interactive.js';
import { logger } from '../src/utils/logger.js';

const mocks = vi.hoisted(() => ({ open: vi.fn(), fetch: vi.fn(), copy: vi.fn() }));
vi.mock('open', () => ({ default: mocks.open }));
vi.mock('../src/utils/http.js', () => ({ apiFetch: mocks.fetch }));
vi.mock('../src/project/copy.js', () => ({ copyDir: mocks.copy }));
vi.mock('../src/utils/json-output.js', () => ({ outputJson: vi.fn() }));

let directory: string;
let client: TelemetryClient;
let exporter: InMemoryLogRecordExporter;
const botId = '11111111-1111-4111-8111-111111111111';

beforeEach(async () => {
  vi.clearAllMocks();
  directory = await mkdtemp(join(tmpdir(), 'teams-telemetry-hooks-'));
  const state = new TelemetryState(join(directory, 'state.json'));
  await state.setEnrollment('on');
  exporter = new InMemoryLogRecordExporter();
  client = await startTelemetry({
    state,
    version: 'test',
    enabled: true,
    env: {},
    exporter: () => exporter,
  });
  setTelemetry(client);
});

afterEach(async () => {
  await client.close();
  setTelemetry(await startTelemetry({ version: 'test', enabled: false }));
  await rm(directory, { recursive: true, force: true });
});

describe('shared telemetry boundaries', () => {
  it.each([false, true])(
    'starts a project only if the pre-start flush was not cancelled (cancelled: %s)',
    async (cancelled) => {
      const { createProjectFromTemplate } = await import('../src/commands/project/shared.js');
      const originalCwd = process.cwd();
      const autoConfirm = isAutoConfirm();
      const controller = new AbortController();
      const restoreCancellation = setCancellationSignal(controller.signal);
      const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
      const flush = vi.spyOn(client, 'flush').mockImplementationOnce(async (): Promise<void> => {
        if (cancelled) controller.abort();
      });
      const startProject = vi.fn<(targetDir: string, projectName: string) => void>();
      const strategy: ProjectLanguageStrategy = {
        language: 'typescript',
        displayName: 'TypeScript',
        templates: ['echo'],
        normalizeProjectName: (name: string): string => name,
        validateProjectName: (): void => undefined,
        mapBaseEnvVars: (values: Record<string, string>): Record<string, string> => values,
        renderNextSteps: (): void => undefined,
        startProject,
      };
      mocks.copy.mockResolvedValue(undefined);
      try {
        process.chdir(directory);
        setAutoConfirm(true);
        const result = createProjectFromTemplate(
          'project',
          { template: 'echo', start: true, clientId: botId },
          strategy
        );
        if (cancelled) {
          await expect(result).rejects.toMatchObject({ name: 'AbortError' });
          expect(startProject).not.toHaveBeenCalled();
        } else {
          await result;
          expect(startProject).toHaveBeenCalledExactlyOnceWith(
            join(directory, 'project'),
            'project'
          );
        }
        expect(flush).toHaveBeenCalledOnce();
      } finally {
        flush.mockRestore();
        info.mockRestore();
        restoreCancellation();
        setAutoConfirm(autoConfirm);
        process.chdir(originalCwd);
      }
    }
  );

  it('attributes the shared scaffold start before copying and preserves it on retry', async () => {
    const { createProjectFromTemplate } = await import('../src/commands/project/shared.js');
    const originalCwd = process.cwd();
    const strategy = {
      language: 'typescript' as const,
      displayName: 'TypeScript',
      templates: ['echo'],
      normalizeProjectName: (name: string): string => name,
      validateProjectName: (): void => undefined,
      mapBaseEnvVars: (values: Record<string, string>): Record<string, string> => values,
      renderNextSteps: (): void => undefined,
    };
    mocks.copy.mockImplementationOnce(async () => {
      await client.flush();
      const starts = exporter
        .getFinishedLogRecords()
        .filter(
          (record) => record.body === 'teams.cli.operation' && record.attributes.phase === 'started'
        );
      expect(starts).toHaveLength(1);
      expect(starts[0].attributes.attemptId).toBeTruthy();
      expect(starts[0].attributes.attemptStartedAt).toBeTruthy();
      expect(starts[0].attributes.attemptOrigin).toBe('project.create');
      throw new Error('Copy interrupted');
    });
    try {
      process.chdir(directory);
      await expect(
        createProjectFromTemplate('project', { template: 'echo', json: true }, strategy)
      ).rejects.toThrow('Copy interrupted');
      mocks.copy.mockResolvedValueOnce(undefined);
      await createProjectFromTemplate('project', { template: 'echo', json: true }, strategy);
      await client.flush();
      const records = exporter
        .getFinishedLogRecords()
        .filter((record) => record.body === 'teams.cli.operation');
      expect(records).toHaveLength(4);
      expect(records[0].attributes.attemptId).toBe(records[2].attributes.attemptId);
      expect(records[0].attributes.attemptStartedAt).toBe(records[2].attributes.attemptStartedAt);
      expect(records[0].attributes.operationId).not.toBe(records[2].attributes.operationId);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('does not turn a rejected project name into an attempt for the current directory', async () => {
    const { createProjectFromTemplate } = await import('../src/commands/project/shared.js');
    await expect(
      createProjectFromTemplate(
        'invalid',
        { template: 'echo', json: true },
        {
          language: 'typescript',
          displayName: 'TypeScript',
          templates: ['echo'],
          normalizeProjectName: () => '',
          validateProjectName: () => {
            throw new Error('Invalid project name');
          },
          mapBaseEnvVars: (values) => values,
          renderNextSteps: () => undefined,
        }
      )
    ).rejects.toThrow('Invalid project name');
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records.every((record) => record.attributes.attemptId === undefined)).toBe(true);
    expect(records[1].attributes.outcome).toBe('failed');
  });

  it('records a scaffold failure against its target before any bot exists', async () => {
    const { scaffoldProject } = await import('../src/project/scaffold.js');
    const target = join(directory, 'project');
    mocks.copy.mockRejectedValue(new Error('private copy failure'));
    await expect(
      scaffoldProject({
        name: 'private name',
        targetDir: target,
        language: 'typescript',
        template: 'echo',
      })
    ).rejects.toThrow('private copy failure');
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records[0].attributes).toMatchObject({
      operation: 'project.create',
      phase: 'started',
      language: 'typescript',
    });
    expect(records[1].attributes).toMatchObject({
      outcome: 'failed',
      attemptOrigin: 'project.create',
    });
    expect(records[1].attributes.attemptId).toBeTruthy();
    expect(JSON.stringify(records)).not.toContain('private copy failure');
  });

  it('observes only actual Teams install-link opens, never portal or auth browsing', async () => {
    const { openInBrowser } = await import('../src/utils/browser.js');
    mocks.open.mockResolvedValue(undefined);
    await openInBrowser('https://login.microsoftonline.com/common');
    await openInBrowser('https://dev.teams.microsoft.com/apps/private-app');
    await openInBrowser(`https://teams.microsoft.com/l/app/${botId}?installAppPackage=true`);
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records[1].attributes).toMatchObject({
      operation: 'app.install_link_open',
      outcome: 'succeeded',
      teamsAppId: botId,
    });
    exporter.reset();
    mocks.open.mockRejectedValueOnce(new Error('browser failed'));
    await expect(openInBrowser(`https://teams.microsoft.com/l/app/${botId}`)).rejects.toThrow();
    await client.flush();
    expect(
      exporter.getFinishedLogRecords().find((record) => record.attributes.phase === 'completed')
        ?.attributes.outcome
    ).toBe('failed');
  });

  it('records failed socket configuration without logging the token or endpoint', async () => {
    const { setSocketMode } = await import('../src/apps/bot-communication.js');
    mocks.fetch.mockResolvedValueOnce(new Response('', { status: 404 }));
    mocks.fetch.mockResolvedValueOnce(new Response('private response', { status: 403 }));
    await expect(setSocketMode('private token', botId, true)).rejects.toThrow('403');
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records).toHaveLength(2);
    expect(records[1].attributes).toMatchObject({
      operation: 'app.configure',
      transport: 'socket',
      outcome: 'failed',
      botId,
    });
    expect(JSON.stringify(records)).not.toContain('private');
  });

  it('keeps the scaffold attempt when registration uses a nested C# credentials directory', async () => {
    const project = join(directory, 'Solution');
    await mkdir(join(project, 'Agent'), { recursive: true });
    await writeFile(join(project, 'Solution.sln'), '');
    await writeFile(join(project, 'Agent', 'Agent.csproj'), '');
    await client.run('project.create', { language: 'csharp' }, async () => undefined, {
      target: project,
      origin: 'project.create',
    });
    await client.run('app.register', {}, async () => undefined, {
      target: join(project, 'Agent'),
      origin: 'registration',
    });
    await client.flush();
    const records = exporter
      .getFinishedLogRecords()
      .filter((record) => record.body === 'teams.cli.operation');
    expect(records[0].attributes.attemptId).toBe(records[2].attributes.attemptId);
  });
});
