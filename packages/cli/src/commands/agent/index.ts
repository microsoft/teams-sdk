import { Command } from 'commander';
import { agentBlueprintCommand } from './blueprint/index.js';
import { agentUserCommand } from './user/index.js';

export const agentCommand = new Command('agent')
  .description('Manage Microsoft Agent 365 agents')
  .action(function (this: Command) {
    this.help();
  });

agentCommand.addCommand(agentBlueprintCommand);
agentCommand.addCommand(agentUserCommand);
