import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// From dist/project/paths.js, go up two levels to project root
export const packageRoot = path.resolve(__dirname, '..', '..');
export const templatesDir = path.join(packageRoot, 'templates');
export const staticsDir = path.join(packageRoot, 'statics');
