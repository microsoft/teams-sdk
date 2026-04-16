import { Command } from 'commander';
import { botGetCommand } from './get.js';
import { botMigrateCommand } from './migrate.js';

export const botCommand = new Command('bot').description('Manage bot registration');

botCommand.addCommand(botGetCommand);
botCommand.addCommand(botMigrateCommand);
