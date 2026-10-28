import { Command } from 'commander';
import { agentBlueprintCreateCommand } from './create.js';
import { agentBlueprintDeleteCommand } from './delete.js';
import { agentBlueprintUpdateCommand } from './update.js';

export const agentBlueprintCommand = new Command('blueprint')
  .description('Manage Agent 365 agent blueprints')
  .action(function (this: Command) {
    this.help();
  });

agentBlueprintCommand.addCommand(agentBlueprintCreateCommand);
agentBlueprintCommand.addCommand(agentBlueprintUpdateCommand);
agentBlueprintCommand.addCommand(agentBlueprintDeleteCommand);
