<!-- setup-example -->

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App({
  state: true,
});
```

<!-- oauth-note -->

Registering an OAuth flow with `addOAuthFlow()` automatically enables state so pending sign-ins can be associated with the correct flow. Set `state: false` explicitly to fall back to process-local in-memory maps.

<!-- read-write-example -->

```typescript
app.on('message', async (ctx) => {
  if (!ctx.state) {
    throw new Error('Turn state is not enabled.');
  }

  const count = (ctx.state.conversation.get<number>('messageCount') ?? 0) + 1;
  ctx.state.conversation.set('messageCount', count);

  if (ctx.state.user && ctx.activity.text?.startsWith('my name is ')) {
    ctx.state.user.set(
      'name',
      ctx.activity.text.slice('my name is '.length).trim()
    );
  }

  const name = ctx.state.user?.get<string>('name') ?? 'there';
  await ctx.reply(`Hello, ${name}. Message #${count}.`);
});
```

<!-- state-operations -->

Use `has()` to check for a value, `delete()` to remove one, and `clear()` to remove all values. If you mutate an object or array returned by `get()`, call `set()` with the updated value so the scope is marked for persistence.

<!-- clear-example -->

```typescript
await ctx.state.delete();
```

<!-- distributed-intro -->

For production or multi-instance deployments, implement the Teams SDK's `IStorage<string, string>` contract with a shared, durable backend and pass it through `state.storage`. The state API used by handlers doesn't change:

<!-- distributed-example -->

```typescript
import type { IStorage } from '@microsoft/teams.common';
import { App } from '@microsoft/teams.apps';

function createApp(durableStorage: IStorage<string, string>): App {
  return new App({
    state: {
      storage: durableStorage,
      keyPrefix: 'my-app',
    },
  });
}
```

<!-- distributed-details -->

The SDK serializes each scope as a JSON string and replaces the complete scope on save, so concurrent turns use last-writer-wins semantics. Configure expiry, retries, and other storage-specific behavior on your storage implementation.
