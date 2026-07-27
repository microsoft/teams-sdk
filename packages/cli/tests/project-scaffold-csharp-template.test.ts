import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffoldProject } from '../src/project/scaffold.js';

describe('C# scaffold template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'teams-cli-csharp-template-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the .NET 2.1 preview package and hosting API', async () => {
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
      '<PackageReference Include="Microsoft.Teams.Apps" Version="2.1.0-preview.*" />'
    );
    expect(csproj).not.toContain('Microsoft.Teams.Plugins.AspNetCore');
    expect(program).toContain('builder.Services.AddTeamsBotApplication();');
    expect(program).toContain('TeamsBotApplication teams = app.UseTeamsBotApplication();');
    expect(program).toContain('await context.TypingAsync(cancellationToken: cancellationToken);');
    expect(program).toContain('await context.SendAsync');
    expect(program).not.toContain('builder.AddTeams();');
    expect(program).not.toContain('app.UseTeams();');
  });
});
