import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  rmdir,
  readdir,
  realpath,
} from 'node:fs/promises';
import { basename, dirname, join, resolve, parse } from 'node:path';
import { randomUUID } from 'node:crypto';
import { paths } from '../utils/paths.js';
import { isGuid, type AttemptOrigin } from './contract.js';

export interface Attempt {
  target: string;
  id: string;
  startedAt: string;
  origin: AttemptOrigin;
}

interface StateData {
  version: 1;
  enrollment: 'on' | 'off';
  generation: number;
  installationId?: string;
  firstUse?: boolean;
  attempts?: Attempt[];
}

export interface EnrollmentSession {
  installationId: string;
  generation: number;
}

export interface CliEnrollmentSession extends EnrollmentSession {
  firstUse: boolean;
}

function isAttempt(value: unknown): value is Attempt {
  return (
    typeof value === 'object' &&
    value !== null &&
    'target' in value &&
    typeof value.target === 'string' &&
    'id' in value &&
    isGuid(value.id) &&
    'startedAt' in value &&
    typeof value.startedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.startedAt) &&
    Number.isFinite(Date.parse(value.startedAt)) &&
    'origin' in value &&
    (value.origin === 'project.create' || value.origin === 'registration')
  );
}

function isState(value: unknown): value is StateData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'enrollment' in value &&
    (value.enrollment === 'on' || value.enrollment === 'off') &&
    'generation' in value &&
    typeof value.generation === 'number' &&
    Number.isSafeInteger(value.generation) &&
    value.generation >= 0 &&
    (!('installationId' in value) || isGuid(value.installationId)) &&
    (!('firstUse' in value) || typeof value.firstUse === 'boolean') &&
    (!('attempts' in value) || (Array.isArray(value.attempts) && value.attempts.every(isAttempt)))
  );
}

async function localTarget(target: string): Promise<string> {
  const absolute = resolve(target);
  try {
    const canonical = await realpath(absolute);
    return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  } catch {
    if (dirname(absolute) === absolute) return absolute;
    const canonical = join(await localTarget(dirname(absolute)), basename(absolute));
    return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  }
}

export class TelemetryState {
  constructor(public readonly file: string = join(paths.data, 'telemetry-v1.json')) {}

  private async read(): Promise<StateData | undefined> {
    try {
      const value: unknown = JSON.parse(await readFile(this.file, 'utf8'));
      if (!isState(value)) throw new Error('Invalid telemetry state');
      return {
        version: 1,
        enrollment: value.enrollment,
        generation: value.generation,
        ...(value.installationId ? { installationId: value.installationId } : {}),
        ...(value.firstUse !== undefined ? { firstUse: value.firstUse } : {}),
        ...(value.attempts
          ? {
              attempts: value.attempts.map(({ target, id, startedAt, origin }) => ({
                target,
                id,
                startedAt,
                origin,
              })),
            }
          : {}),
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async enrollment(): Promise<'on' | 'off' | undefined> {
    try {
      return (await this.read())?.enrollment;
    } catch {
      return undefined;
    }
  }

  async isCurrent(session: EnrollmentSession): Promise<boolean> {
    try {
      const state = await this.read();
      return (
        state?.enrollment === 'on' &&
        state.generation === session.generation &&
        state.installationId === session.installationId
      );
    } catch {
      return false;
    }
  }

  private async update<T>(
    change: (state: StateData) => T,
    allowed: () => boolean = () => true
  ): Promise<T> {
    await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
    const lock = `${this.file}.lock`;
    let locked = false;
    for (let retry = 0; retry < 30; retry++) {
      if (!allowed()) throw new Error('Telemetry cancelled');
      try {
        await mkdir(lock);
        locked = true;
        break;
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
        await new Promise<void>((done) => setTimeout(done, 5));
      }
    }
    if (!locked) throw new Error('Telemetry state is locked');
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      const state = (await this.read()) ?? { version: 1, enrollment: 'off', generation: 0 };
      if (!allowed()) throw new Error('Telemetry cancelled');
      const result = change(state);
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
      await rename(temporary, this.file);
      return result;
    } finally {
      await unlink(temporary).catch(() => undefined);
      await rmdir(lock).catch(() => undefined);
    }
  }

  async setEnrollment(enrollment: 'on' | 'off'): Promise<void> {
    await this.update((state) => {
      if (state.enrollment === enrollment) return;
      state.enrollment = enrollment;
      state.generation++;
      delete state.installationId;
      delete state.firstUse;
      delete state.attempts;
    });
  }

  async begin(allowed: () => boolean = () => true): Promise<EnrollmentSession | undefined> {
    if (!allowed() || (await this.enrollment()) !== 'on') return undefined;
    return this.update((state) => {
      if (state.enrollment !== 'on') return undefined;
      return this.session(state);
    }, allowed);
  }

  private session(state: StateData): EnrollmentSession {
    state.installationId ??= randomUUID();
    return { installationId: state.installationId, generation: state.generation };
  }

  async beginCli(allowed: () => boolean = () => true): Promise<CliEnrollmentSession | undefined> {
    if (!allowed() || (await this.enrollment()) !== 'on') return undefined;
    return this.update((state) => {
      if (state.enrollment !== 'on') return undefined;
      const session = this.session(state);
      const firstUse = !state.firstUse;
      state.firstUse = true;
      return { ...session, firstUse };
    }, allowed);
  }

  async attempt(
    target: string,
    origin: AttemptOrigin,
    session?: EnrollmentSession
  ): Promise<Attempt | undefined> {
    const canonical = await localTarget(target);
    return this.update((state) => {
      if (state.enrollment !== 'on') return undefined;
      if (
        session &&
        (state.installationId !== session.installationId || state.generation !== session.generation)
      )
        return undefined;
      const attempts = (state.attempts ??= []);
      let attempt = attempts.find((item) => item.target === canonical);
      if (!attempt) {
        if (attempts.length >= 1000) return undefined;
        attempt = {
          target: canonical,
          id: randomUUID(),
          startedAt: new Date().toISOString(),
          origin,
        };
        attempts.push(attempt);
      }
      return attempt;
    });
  }

  async resolveAttempt(start: string = process.cwd()): Promise<Attempt | undefined> {
    const state = await this.read();
    if (state?.enrollment !== 'on') return undefined;
    let directory = await localTarget(start);
    while (true) {
      const known = state.attempts?.find((item) => item.target === directory);
      if (known) return known;
      try {
        const files = await readdir(directory);
        if (files.some((file) => file.endsWith('.csproj'))) {
          const parent = state.attempts?.find((item) => item.target === dirname(directory));
          if (parent && (await readdir(parent.target)).some((file) => file.endsWith('.sln')))
            return parent;
        }
        if (
          files.some(
            (file) =>
              file === 'package.json' ||
              file === 'pyproject.toml' ||
              file.endsWith('.csproj') ||
              file.endsWith('.sln')
          )
        )
          return undefined;
      } catch {
        /* The target may not exist yet. */
      }
      if (directory === parse(directory).root) return undefined;
      directory = dirname(directory);
    }
  }

  async projectTarget(start: string = process.cwd()): Promise<string | undefined> {
    let directory = await localTarget(start);
    while (true) {
      try {
        const files = await readdir(directory);
        if (
          files.some(
            (file) =>
              file === 'package.json' ||
              file === 'pyproject.toml' ||
              file.endsWith('.csproj') ||
              file.endsWith('.sln')
          )
        )
          return directory;
      } catch {
        /* Keep looking for the containing project. */
      }
      if (directory === parse(directory).root) return undefined;
      directory = dirname(directory);
    }
  }
}
