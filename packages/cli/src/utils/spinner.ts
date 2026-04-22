import { createSpinner as nanoCreateSpinner } from 'nanospinner';
import { Writable } from 'node:stream';

const devNull = new Writable({
  write(_chunk, _enc, cb) {
    cb();
  },
});

/**
 * Create a spinner. When `silent` is true, the spinner renders to a no-op
 * stream so no visual output appears, but the API contract is preserved.
 */
export function createSilentSpinner(text?: string, silent = false) {
  return nanoCreateSpinner(
    text,
    silent ? { stream: devNull as unknown as NodeJS.WriteStream } : undefined
  );
}
