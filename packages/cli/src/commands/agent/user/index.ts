import { Command } from 'commander';
import { agentUserCreateCommand } from './create.js';
import { agentUserDeleteCommand } from './delete.js';
import { isInteractive } from '../../../utils/interactive.js';

export const agentUserCommand = new Command('user')
  .description('Create an Agent 365 agentic user (and its identity + blueprint if needed)')
  .action(async function (this: Command) {
    if (!isInteractive()) {
      this.help();
      return;
    }

    // Only subcommand is create — auto-delegate
    await agentUserCreateCommand.parseAsync([], { from: 'user' });
  });

agentUserCommand.addCommand(agentUserCreateCommand);
agentUserCommand.addCommand(agentUserDeleteCommand);
