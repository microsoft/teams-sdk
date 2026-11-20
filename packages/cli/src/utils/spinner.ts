import { createSpinner as nanoCreateSpinner, type Spinner } from 'nanospinner';
import { Writable } from 'node:stream';

const devNull = new Writable({
  write(_chunk, _enc, cb) {
    cb();
  },
});

const activeSpinners = new Set<Spinner>();
let signalsManaged = false;

export function manageSpinnerSignals(): () => void {
  signalsManaged = true;
  return () => {
    signalsManaged = false;
  };
}

export function stopSpinners(): void {
  for (const spinner of activeSpinners) {
    try {
      spinner.stop();
    } catch {
      /* Rendering failure must not prevent cancellation. */
    }
  }
}

/**
 * Create a spinner. When `silent` is true, the spinner renders to a no-op
 * stream so no visual output appears, but the API contract is preserved.
 */
export function createSilentSpinner(text?: string, silent = false): Spinner {
  const spinner = nanoCreateSpinner(
    text,
    silent ? { stream: devNull as unknown as NodeJS.WriteStream } : undefined
  );
  const start = spinner.start;
  const stop = spinner.stop;
  spinner.start = (options: Parameters<Spinner['start']>[0]): Spinner => {
    const signals = ['SIGINT', 'SIGTERM'] as const;
    const listeners = signalsManaged
      ? signals.map((signal) => new Set(process.listeners(signal)))
      : undefined;
    const result = start(options);
    activeSpinners.add(spinner);
    // Nanospinner exits synchronously; the CLI signal owner must finalize first.
    if (listeners) {
      for (const [index, signal] of signals.entries()) {
        for (const listener of process.listeners(signal)) {
          if (!listeners[index].has(listener)) process.removeListener(signal, listener);
        }
      }
    }
    return result;
  };
  spinner.stop = (options: Parameters<Spinner['stop']>[0]): Spinner => {
    activeSpinners.delete(spinner);
    return stop(options);
  };
  return spinner;
}
