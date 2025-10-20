---
sidebar_position: 1
summary: How to convert your Teams app into an MCP server using the McpPlugin to expose tools, resources, and prompts to other MCP applications.
---

# MCP Server

You are able to convert any `App` into an MCP server by using the `McpPlugin`. This plugin adds the necessary endpoints to your application to serve as an MCP server. The plugin allows you to define tools, resources, and prompts that can be exposed to other MCP applications. 

Install it to your application:

```bash
npm install @microsoft/teams.mcp
```

Your plugin can be configured as follows:

```typescript
import { z } from 'zod';
import { App } from '@microsoft/teams.apps';
import { McpPlugin } from '@microsoft/teams.mcp';
// ...

const mcpServerPlugin = new McpPlugin({
  // Describe the MCP server with a helpful name and description
  // for MCP clients to discover and use it.
  name: 'test-mcp',
  description: 'Allows you to test the mcp server',
  // Optionally, you can provide a URL to the mcp dev-tools
  // during development
  inspector: 'http://localhost:5173?proxyPort=9000',
}).tool(
  // Describe the tools with helpful names and descriptions
  'echo',
  'echos back whatever you said',
  {
    input: z.string().describe('the text to echo back'),
  },
  {
    readOnlyHint: true,
    idempotentHint: true
  },
  async ({ input }) => {
    return {
      content: [
        {
          type: 'text',
          text: `you said "${input}"`,
        },
      ],
    };
  }
);
```

:::note
By default, the MCP server will be available at `/mcp` on your application. You can change this by setting the `transport.path` property in the plugin configuration.
:::

And included in the app like any other plugin:

```typescript
import { App } from '@microsoft/teams.apps';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { McpPlugin } from '@microsoft/teams.mcp';
// ...

const app = new App({
  plugins: [
    new DevtoolsPlugin(),
    // Add this plugin
    mcpServerPlugin,
  ],
});
```

:::tip
Enabling mcp request inspection and the `DevtoolsPlugin` allows you to see all the requests and responses to and from your MCP server (similar to how the **Activities** tab works).
:::

![MCP Server in Devtools](/screenshots/mcp-devtools.gif)

## Piping messages to the user

Since your agent is provisioned to work on Teams, one very helpful feature is to use this server as a way to send messages to the user. This can be helpful in various scenarios:

1. Human in the loop - if the server or an MCP client needs to confirm something with the user, it is able to do so.
2. Notifications - the server can be used as a way to send notifications to the user.

Here is an example of how to do this. Configure your plugin so that:
1. It can validate if the incoming request is allowed to send messages to the user
2. It fetches the correct conversation ID for the given user. 
3. It sends a proactive message to the user. See [Proactive Messaging](../../../essentials/sending-messages/proactive-messaging) for more details.

```typescript
import { z } from 'zod';
import { App } from '@microsoft/teams.apps';
import { McpPlugin } from '@microsoft/teams.mcp';
// ...

// Keep a store of the user to the conversation id
// In a production app, you probably would want to use a
// persistent store like a database
const userToConversationId = new Map<string, string>();

// Add a an MCP server tool
mcpServerPlugin.tool(
  'alertUser',
  'alerts the user about something important',
  {
    input: z.string().describe('the text to echo back'),
    userAadObjectId: z.string().describe('the user to alert'),
  },
  {
    readOnlyHint: true,
    idempotentHint: true
  },
  async ({ input, userAadObjectId }, { authInfo }) => {
    if (!isAuthValid(authInfo)) {
      throw new Error('Not allowed to call this tool');
    }

    const conversationId = userToConversationId.get(userAadObjectId);
    if (!conversationId) {
      console.log('Current conversation map', userToConversationId);
      return {
        content: [
          {
            type: 'text',
            text: `user ${userAadObjectId} is not in a conversation`,
          },
        ],
      };
    }

    // Leverage the app's proactive messaging capabilities to send a mesage to
    // correct conversation id.
    await app.send(conversationId, `Notification: ${input}`);
    return {
      content: [
        {
          type: 'text',
          text: 'User was notified',
        },
      ],
    };
  }
);
```

```typescript
import { App } from '@microsoft/teams.apps';
// ...

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  await send(`you said "${activity.text}"`);
  if (activity.from.aadObjectId && !userToConversationId.has(activity.from.aadObjectId)) {
    userToConversationId.set(activity.from.aadObjectId, activity.conversation.id);
    app.log.info(
      `Just added user ${activity.from.aadObjectId} to conversation ${activity.conversation.id}`
    );
  }
});
```

