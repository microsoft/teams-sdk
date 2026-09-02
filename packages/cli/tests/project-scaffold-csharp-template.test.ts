import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffoldProject } from '../src/project/scaffold.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe('C# scaffold template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'teams-cli-csharp-template-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the stable .NET 2.1 package and hosting API', async () => {
    await scaffoldProject({
      name: 'PokemonCatcher',
      language: 'csharp',
      template: 'echo',
      targetDir: tempDir,
    });

    const projectDir = path.join(tempDir, 'PokemonCatcher');
    const csproj = fs.readFileSync(path.join(projectDir, 'PokemonCatcher.csproj'), 'utf8');
    const program = fs.readFileSync(path.join(projectDir, 'Program.cs'), 'utf8');

    expect(csproj).toContain(
      '<PackageReference Include="Microsoft.Teams.Apps" Version="2.1.0" />'
    );
    expect(csproj).not.toContain('Microsoft.Teams.Plugins.AspNetCore');
    expect(program).toContain('builder.Services.AddTeamsBotApplication();');
    expect(program).toContain('TeamsBotApplication teams = app.UseTeamsBotApplication();');
    expect(program).toContain('await context.TypingAsync(cancellationToken: cancellationToken);');
    expect(program).toContain('await context.SendAsync');
    expect(program).not.toContain('builder.AddTeams();');
    expect(program).not.toContain('app.UseTeams();');
  });

  it('scaffolds a launchSettings.json that is BOM-free and parseable', async () => {
    await scaffoldProject({
      name: 'PokemonCatcher',
      language: 'csharp',
      template: 'echo',
      targetDir: tempDir,
    });

    const launchSettings = path.join(tempDir, 'PokemonCatcher', 'Properties', 'launchSettings.json');
    const raw = fs.readFileSync(launchSettings, 'utf8');

    // A UTF-8 BOM here breaks JSON.parse when the CLI writes credentials.
    expect(raw.startsWith('\uFEFF')).toBe(false);
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('template files', () => {
  it('contains no files with a UTF-8 BOM', () => {
    const templatesDir = path.join(testDir, '..', 'templates');
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const buf = Buffer.alloc(3);
          const fd = fs.openSync(full, 'r');
          let read: number;
          try {
            read = fs.readSync(fd, buf, 0, 3, 0);
          } finally {
            fs.closeSync(fd);
          }
          if (read === 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
            offenders.push(path.relative(templatesDir, full));
          }
        }
      }
    };

    walk(templatesDir);

    expect(offenders).toEqual([]);
  });
});
