import { Command } from 'commander';
import { agentUserCreateCommand } from './create.js';
import { agentUserDeleteCommand } from './delete.js';
import { agentUserUpdateCommand } from './update.js';
import { agentUserPermissionsCommand } from './permissions/index.js';

export const agentUserCommand = new Command('user')
  .description('Create an Agent 365 agentic user (and its identity + blueprint if needed)')
  .action(function (this: Command) {
    this.help();
  });

agentUserCommand.addCommand(agentUserCreateCommand);
agentUserCommand.addCommand(agentUserUpdateCommand);
agentUserCommand.addCommand(agentUserDeleteCommand);
agentUserCommand.addCommand(agentUserPermissionsCommand);
