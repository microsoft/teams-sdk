import { describe, it, expect } from 'vitest';
import { Command, Option } from 'commander';
import { execSync } from 'node:child_process';
import { serializeCommand, serializeCommandTree } from '../src/utils/json-help.js';

const CLI = 'node dist/index.js';

function run(command: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: (execError.stdout ?? '') + (execError.stderr ?? ''),
      exitCode: execError.status ?? 1,
    };
  }
}

// ---------------------------------------------------------------------------
// Unit tests — serializeCommand / serializeCommandTree
// ---------------------------------------------------------------------------
describe('serializeCommand', () => {
  it('serializes a leaf command with options and arguments', () => {
    const cmd = new Command('list')
      .description('List items')
      .argument('<appId>', 'App ID')
      .option('--json', '[OPTIONAL] Output as JSON');

    const result = serializeCommand(cmd);

    expect(result.name).toBe('list');
    expect(result.description).toBe('List items');
    expect(result.arguments).toHaveLength(1);
    expect(result.arguments[0].name).toBe('appId');
    expect(result.arguments[0].required).toBe(true);
    expect(result.options).toHaveLength(1);
    expect(result.options[0].flags).toBe('--json');
    expect(result.commands).toEqual([]);
  });

  it('serializes nested commands recursively', () => {
    const parent = new Command('app').description('Manage apps');
    const child = new Command('create').description('Create app');
    parent.addCommand(child);

    const result = serializeCommand(parent);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe('create');
    expect(result.commands[0].description).toBe('Create app');
  });

  it('filters out --help and --version options', () => {
    const cmd = new Command('test')
      .description('Test')
      .version('1.0.0')
      .option('--json', 'JSON output');

    const result = serializeCommand(cmd);

    const flags = result.options.map((o) => o.flags);
    expect(flags).not.toContain('--help');
    expect(flags).not.toContain('-h, --help');
    expect(flags).not.toContain('-V, --version');
    expect(result.options).toHaveLength(1);
    expect(result.options[0].flags).toBe('--json');
  });

  it('serializes optional arguments correctly', () => {
    const cmd = new Command('view').description('View').argument('[appId]', 'Optional app ID');

    const result = serializeCommand(cmd);

    expect(result.arguments[0].required).toBeUndefined();
  });

  it('serializes required arguments correctly', () => {
    const cmd = new Command('view').description('View').argument('<appId>', 'App ID');

    const result = serializeCommand(cmd);

    expect(result.arguments[0].required).toBe(true);
  });

  it('includes default values when present', () => {
    const cmd = new Command('run')
      .description('Run')
      .option('--port <port>', 'Port number', '3000');

    const result = serializeCommand(cmd);

    expect(result.options[0].defaultValue).toBe('3000');
  });

  it('omits defaultValue when not present', () => {
    const cmd = new Command('run').description('Run').option('--name <name>', 'Name');

    const result = serializeCommand(cmd);

    expect(result.options[0]).not.toHaveProperty('defaultValue');
  });

  it('includes choices when present', () => {
    const cmd = new Command('add').description('Add');
    cmd.addOption(new Option('--type <type>', 'Type').choices(['Application', 'Delegated']));

    const result = serializeCommand(cmd);

    expect(result.options[0].choices).toEqual(['Application', 'Delegated']);
  });

  it('distinguishes mandatory options from options with required values', () => {
    const cmd = new Command('add')
      .description('Add')
      .requiredOption('--type <type>', 'Permission type')
      .option('--name <name>', 'Optional name with required value');

    const result = serializeCommand(cmd);

    const typeOpt = result.options.find((o) => o.flags.includes('--type'));
    const nameOpt = result.options.find((o) => o.flags.includes('--name'));

    // --type: must be provided, and needs a value
    expect(typeOpt!.requiredIfProvided).toBe(true);
    expect(typeOpt!.mandatory).toBe(true);

    // --name: optional flag, but needs a value if used
    expect(nameOpt!.requiredIfProvided).toBe(true);
    expect(nameOpt!.mandatory).toBe(false);
  });

  it('omits value fields for boolean flags', () => {
    const cmd = new Command('run').description('Run').option('--json', '[OPTIONAL] Output as JSON');

    const result = serializeCommand(cmd);
    const jsonOpt = result.options[0];

    // Boolean flag: no requiredIfProvided/mandatory/variadic
    expect(jsonOpt.flags).toBe('--json');
    expect(jsonOpt.requiredIfProvided).toBeUndefined();
    expect(jsonOpt.mandatory).toBeUndefined();
    expect(jsonOpt.variadic).toBeUndefined();
  });
});

describe('serializeCommandTree', () => {
  it('includes version on root output', () => {
    const cmd = new Command('teams').description('CLI');
    const result = serializeCommandTree(cmd, '2.0.0');

    expect(result.version).toBe('2.0.0');
    expect(result.name).toBe('teams');
  });
});

// ---------------------------------------------------------------------------
// Integration tests — actual CLI invocation
// ---------------------------------------------------------------------------
describe('--help --json CLI integration', () => {
  it('outputs valid JSON for root help', () => {
    const { stdout, exitCode } = run(`${CLI} --help --json`);
    const data = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(data.name).toBe('teams');
    expect(data.version).toBeDefined();
    expect(data.commands).toBeInstanceOf(Array);
    expect(data.commands.length).toBeGreaterThan(0);
  });

  it('includes expected top-level commands', () => {
    const { stdout } = run(`${CLI} --help --json`);
    const data = JSON.parse(stdout);
    const names = data.commands.map((c: { name: string }) => c.name);

    expect(names).toContain('login');
    expect(names).toContain('app');
    expect(names).toContain('status');
  });

  it('outputs subtree for app command', () => {
    const { stdout, exitCode } = run(`${CLI} app --help --json`);
    const data = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(data.name).toBe('app');
    expect(data.commands.length).toBeGreaterThan(0);

    const listCmd = data.commands.find((c: { name: string }) => c.name === 'list');
    expect(listCmd).toBeDefined();
  });

  it('outputs leaf command details', () => {
    const { stdout, exitCode } = run(`${CLI} app list --help --json`);
    const data = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(data.name).toBe('list');
    expect(data.commands).toEqual([]);
    const jsonOpt = data.options.find((o: { flags: string }) => o.flags.includes('--json'));
    expect(jsonOpt).toBeDefined();
  });

  it('does not include version on non-root commands', () => {
    const { stdout } = run(`${CLI} app --help --json`);
    const data = JSON.parse(stdout);

    expect(data.version).toBeUndefined();
  });

  it('produces no non-JSON output', () => {
    const { stdout } = run(`${CLI} --help --json`);
    // stdout should be valid JSON with no extra text
    expect(() => JSON.parse(stdout)).not.toThrow();
    const parsed = JSON.parse(stdout);
    expect(stdout.trim()).toBe(JSON.stringify(parsed, null, 2));
  });

  it('works with flags in different order', () => {
    const { stdout, exitCode } = run(`${CLI} --json app --help`);
    const data = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(data.name).toBe('app');
  });

  it('works with -h shorthand', () => {
    const { stdout, exitCode } = run(`${CLI} -h --json`);
    const data = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(data.name).toBe('teams');
    expect(data.version).toBeDefined();
  });
});
