import fs from 'node:fs';
import path from 'node:path';
import { input, select } from '@inquirer/prompts';

// Sentinels for non-path picker choices. Null-byte-prefixed so they can never
// collide with a real filesystem path.
const CUSTOM = '\0custom';
const TERMINAL = '\0terminal';

// Standard credential destinations for a .NET project, in the order they are
// offered interactively. appsettings.json is first to match the default fallback.
const CSHARP_DESTINATIONS = [
  'appsettings.json',
  path.join('Properties', 'launchSettings.json'),
];

function hasCsproj(dir: string): boolean {
  try {
    return fs.readdirSync(dir).some((f) => f.toLowerCase().endsWith('.csproj'));
  } catch {
    return false;
  }
}

/**
 * Detect a C# project by locating the directory that contains a `.csproj` file.
 * Searches the given directory first, then its immediate subdirectories (a
 * scaffolded project nests the csproj one level below the solution root).
 * Returns the absolute path to the project directory, or undefined.
 */
export function detectCsharpProjectDir(cwd: string = process.cwd()): string | undefined {
  if (hasCsproj(cwd)) return cwd;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const subDir = path.join(cwd, entry.name);
    if (hasCsproj(subDir)) return subDir;
  }

  return undefined;
}

/**
 * Prompt the user to choose where credentials should be written for a detected
 * C# project. Returns an absolute file path, or undefined to show in terminal.
 */
export async function promptCredentialDestination(projectDir: string): Promise<string | undefined> {
  const choices: Array<{ name: string; value: string }> = CSHARP_DESTINATIONS.map((rel) => {
    const full = path.join(projectDir, rel);
    return {
      name: fs.existsSync(full) ? rel : `${rel} (will be created)`,
      value: full,
    };
  });
  choices.push({ name: 'Enter a custom path…', value: CUSTOM });
  choices.push({ name: 'Show in terminal', value: TERMINAL });

  const selected = await select({
    message: 'Where should the credentials be written?',
    choices,
  });

  if (selected === TERMINAL) return undefined;
  if (selected === CUSTOM) {
    const custom = await input({ message: 'Path to credentials file:' });
    return custom.trim() || undefined;
  }
  return selected;
}

export interface ResolveCredentialDestinationOptions {
  /** Explicit path from --env / --env-file. Always wins when provided. */
  explicit?: string;
  /** Whether prompting is allowed (interactive TTY, not scripting/JSON). */
  interactive: boolean;
  /** Whether the command is running in --json mode. */
  json?: boolean;
  /** Directory to inspect for project structure. Defaults to process.cwd(). */
  cwd?: string;
}

/**
 * Resolve where credentials should be written.
 *
 * - Explicit --env path always wins.
 * - Interactive: prompt with C#-aware suggestions, or a free-text path for
 *   non-C# projects.
 * - Non-interactive (default flow): fall back to appsettings.json for a
 *   detected C# project; otherwise undefined (show in terminal / JSON output).
 * - JSON mode never writes implicitly — only an explicit --env path is honored.
 */
export async function resolveCredentialDestination(
  opts: ResolveCredentialDestinationOptions
): Promise<string | undefined> {
  if (opts.explicit) return opts.explicit;

  const cwd = opts.cwd ?? process.cwd();
  const projectDir = detectCsharpProjectDir(cwd);

  if (opts.interactive && !opts.json) {
    if (projectDir) {
      return promptCredentialDestination(projectDir);
    }
    const custom = await input({
      message:
        'Path to credentials file, e.g. .env or appsettings.json (leave empty to show in terminal):',
    });
    return custom.trim() || undefined;
  }

  if (projectDir && !opts.json) {
    return path.join(projectDir, 'appsettings.json');
  }

  return undefined;
}
