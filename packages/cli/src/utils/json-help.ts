import type { Argument, Option } from 'commander';
import { Command, Help } from 'commander';
import { outputJson } from './json-output.js';

/** A single CLI option (flag) in JSON help output. */
export interface JsonHelpOption {
  flags: string;
  description: string;
  /** If true, a value must be provided when this flag is used (e.g. --name <name>). */
  requiredIfProvided?: boolean;
  /** Whether this flag must be specified. Always present when requiredIfProvided is set. */
  mandatory?: boolean;
  variadic?: boolean;
  defaultValue?: string;
  choices?: string[];
}

/** A single CLI positional argument in JSON help output. */
export interface JsonHelpArgument {
  name: string;
  description: string;
  required?: boolean;
  variadic?: boolean;
  defaultValue?: string;
  choices?: string[];
}

/** A command node in the JSON help tree. */
export interface JsonHelpCommand {
  name: string;
  description: string;
  options: JsonHelpOption[];
  arguments: JsonHelpArgument[];
  commands: JsonHelpCommand[];
}

/** Root-level JSON help output — includes version. */
export interface JsonHelpOutput extends JsonHelpCommand {
  version: string;
}

function serializeOption(opt: Option): JsonHelpOption {
  return {
    flags: opt.flags,
    description: opt.description,
    ...(opt.required ? { requiredIfProvided: true, mandatory: opt.mandatory } : {}),
    ...(!opt.required && opt.mandatory ? { mandatory: true } : {}),
    ...(opt.variadic ? { variadic: true } : {}),
    ...(opt.defaultValue != null ? { defaultValue: String(opt.defaultValue) } : {}),
    ...(opt.argChoices ? { choices: opt.argChoices } : {}),
  };
}

function serializeArgument(arg: Argument): JsonHelpArgument {
  return {
    name: arg.name(),
    description: arg.description,
    ...(arg.required ? { required: true } : {}),
    ...(arg.variadic ? { variadic: true } : {}),
    ...(arg.defaultValue != null ? { defaultValue: String(arg.defaultValue) } : {}),
    ...(arg.argChoices ? { choices: arg.argChoices } : {}),
  };
}

/**
 * Serialize a Commander command (and its subtree) to a plain JSON object.
 * Uses Commander's Help class to get visible items (filters hidden commands/options).
 */
export function serializeCommand(cmd: Command): JsonHelpCommand {
  const helper = new Help();
  const visibleOpts = helper
    .visibleOptions(cmd)
    .filter((opt) => opt.long !== '--help' && opt.long !== '--version');
  const visibleArgs = helper.visibleArguments(cmd);
  const visibleCmds = helper.visibleCommands(cmd).filter((sub) => sub.name() !== 'help');

  return {
    name: cmd.name(),
    description: cmd.description(),
    options: visibleOpts.map(serializeOption),
    arguments: visibleArgs.map(serializeArgument),
    commands: visibleCmds.map((sub) => serializeCommand(sub)),
  };
}

/** Serialize the root program, including the CLI version. */
export function serializeCommandTree(cmd: Command, version: string): JsonHelpOutput {
  return { ...serializeCommand(cmd), version };
}

/** Walk the command tree to find the target command from a list of names. */
function resolveCommand(cmd: Command, args: string[]): Command {
  if (args.length === 0) return cmd;
  const sub = cmd.commands.find((c) => c.name() === args[0] || c.aliases().includes(args[0]));
  if (!sub) return cmd;
  return resolveCommand(sub, args.slice(1));
}

/**
 * If `--help` and `--json` both appear in argv, output the command tree
 * as JSON. Returns true if handled (caller should skip `program.parse()`).
 * Must be called BEFORE `program.parse()`.
 */
export function handleJsonHelp(prog: Command, version: string): boolean {
  const argv = process.argv.slice(2);
  const hasHelp = argv.includes('--help') || argv.includes('-h');
  const hasJson = argv.includes('--json');

  if (!hasHelp || !hasJson) return false;

  const commandPath = argv.filter((a) => !a.startsWith('-'));
  const target = resolveCommand(prog, commandPath);
  const isRoot = target === prog;

  if (isRoot) {
    outputJson(serializeCommandTree(target, version));
  } else {
    outputJson(serializeCommand(target));
  }

  return true;
}
