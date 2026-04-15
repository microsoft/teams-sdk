import * as fs from 'node:fs';
import * as path from 'node:path';
import { CliError } from './errors.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Validate that a buffer is a valid PNG with the expected dimensions.
 * Reads width/height from the IHDR chunk (bytes 16-23, uint32 big-endian).
 */
export function validatePngIcon(buf: Buffer, expectedSize: 32 | 192): void {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new CliError(
      'INVALID_ICON',
      'File is not a valid PNG image.',
      'Teams requires PNG format for app icons.'
    );
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);

  if (width !== expectedSize || height !== expectedSize) {
    throw new CliError(
      'INVALID_ICON',
      `Icon must be ${expectedSize}x${expectedSize}px, got ${width}x${height}px.`
    );
  }
}

/**
 * Read a PNG icon file from disk, validate it, and return the buffer + base64 string.
 */
export function readAndValidateIcon(
  filePath: string,
  expectedSize: 32 | 192
): { buffer: Buffer; base64: string } {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new CliError('INVALID_ICON', `Icon file not found: ${resolved}`);
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(resolved);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw new CliError('INVALID_ICON', `Icon file is not readable: ${resolved}`);
    }
    if (err.code === 'EISDIR') {
      throw new CliError('INVALID_ICON', `Icon path is a directory, not a file: ${resolved}`);
    }
    throw new CliError('INVALID_ICON', `Unable to read icon file: ${resolved}`);
  }
  validatePngIcon(buffer, expectedSize);

  return { buffer, base64: buffer.toString('base64') };
}
