import { mkdir, readFile, writeFile, rename, unlink, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { paths } from '../utils/paths.js';
import { isGuid } from './contract.js';

interface StateData {
  version: 1;
  enrollment: 'on' | 'off';
  generation: number;
  installationId?: string;
}

export interface EnrollmentSession {
  installationId: string;
  generation: number;
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
    (!('installationId' in value) || isGuid(value.installationId))
  );
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
    });
  }

  async begin(allowed: () => boolean = () => true): Promise<EnrollmentSession | undefined> {
    if (!allowed() || (await this.enrollment()) !== 'on') return undefined;
    return this.update((state) => {
      if (state.enrollment !== 'on') return undefined;
      state.installationId ??= randomUUID();
      return { installationId: state.installationId, generation: state.generation };
    }, allowed);
  }
}
