import { Configuration, LogLevel } from '@azure/msal-node';
import envPaths from 'env-paths';
import { logger } from '../utils/logger.js';

// Shared public client ID for CLI auth
const CLIENT_ID = '7ea7c24c-b1f6-4a20-9d11-9ae12e9e7ac0';

const AUTHORITY = 'https://login.microsoftonline.com/common';

export const paths = envPaths('teams-cli', { suffix: '' });

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) {
          logger.error(message);
        }
      },
    },
  },
};

// Empty at login - request scopes on-demand per operation
export const loginScopes: string[] = [];

// On-demand scopes
export const graphScopes = ['https://graph.microsoft.com/Application.ReadWrite.All'];
export const teamsDevPortalScopes = ['https://dev.teams.microsoft.com/AppDefinitions.ReadWrite'];
