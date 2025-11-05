import * as fs from 'fs';

/**
 * Read a UTF-8 file and normalize CRLF (\r\n) to LF (\n).
 * This ensures downstream string operations don't see stray \r characters.
 */
export default function readFileUtf8Normalized(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}
