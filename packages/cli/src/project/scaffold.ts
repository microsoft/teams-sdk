import fs from 'node:fs';
import path from 'node:path';
import { pascalCase } from 'change-case';
import { templatesDir } from './paths.js';
import { copyDir, type CopyContext } from './copy.js';
import { setJsonValue, setEnvVar } from './file-ops.js';

export type ProjectLanguage = 'typescript' | 'csharp' | 'python';

export interface ScaffoldOptions {
  name: string;
  language: ProjectLanguage;
  template: string;
  targetDir: string;
  envVars?: Record<string, string>;
}

/**
 * List available templates for a given language.
 */
export function listTemplates(language: ProjectLanguage): string[] {
  const dir = path.join(templatesDir, language);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory());
}

/**
 * Create a new project from a template.
 */
export async function scaffoldProject(opts: ScaffoldOptions): Promise<void> {
  const { name, language, template, targetDir, envVars } = opts;
  const templateDir = path.join(templatesDir, language, template);

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template "${template}" not found for ${language}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const context: CopyContext = { name, language };
  await copyDir(templateDir, targetDir, context);

  if (envVars && Object.keys(envVars).length > 0) {
    writeEnvVars(language, targetDir, name, envVars);
  }
}

/**
 * Detect the project language from files in a directory.
 */
export function detectLanguage(dir?: string): ProjectLanguage | undefined {
  const d = dir ?? process.cwd();
  if (fs.existsSync(path.join(d, 'package.json'))) return 'typescript';
  if (fs.readdirSync(d).some((file) => file.endsWith('.sln'))) return 'csharp';
  if (fs.existsSync(path.join(d, 'pyproject.toml'))) return 'python';
  return undefined;
}

// --- internal helpers ---

function writeEnvVars(
  language: ProjectLanguage,
  targetDir: string,
  projectName: string,
  envVars: Record<string, string>
): void {
  if (language === 'csharp') {
    // C# uses appsettings.Development.json with PascalCase keys
    const appSettingsPath = path.join(targetDir, projectName, 'appsettings.Development.json');
    if (fs.existsSync(appSettingsPath)) {
      for (const [key, value] of Object.entries(envVars)) {
        const pascalKey = key
          .split('.')
          .map((part) => pascalCase(part))
          .join('.');
        setJsonValue(appSettingsPath, pascalKey, value);
      }
    }
  } else {
    // TypeScript and Python use .env
    const envPath = path.join(targetDir, '.env');
    for (const [key, value] of Object.entries(envVars)) {
      setEnvVar(envPath, key, value);
    }
  }
}
