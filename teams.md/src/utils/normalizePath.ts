/**
 * For cross-platform compatibility, normalize paths to use forward slash
 */
export default function normalizePath(path: string) {
return path.replace(/\\/g, '/');
}