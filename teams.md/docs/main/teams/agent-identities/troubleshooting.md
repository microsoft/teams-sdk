---
sidebar_position: 4
title: Troubleshoot agent identities
summary: Diagnose identity, token, messaging, lifecycle, callback, and publication problems for Agentic Users.
---

# Troubleshoot agent identities

## The activity reaches the runtime, but replies fail

Confirm that the inbound recipient includes both:

- `agenticAppId`
- `agenticUserId`

The SDK needs both fields to construct an `AgenticUser`. Also confirm that the runtime has a tenant ID and a credential capable of acquiring Agentic User tokens.

Do not work around the problem by sending as the blueprint. A converted blueprint is not the conversational identity.

## Proactive messages use the wrong identity

Confirm that you:

1. Stored the Agentic App Instance ID and Agentic User ID for the intended instance.
2. Created the identity with `app.getAgenticUser(...)`.
3. Passed it through `app.send(..., { agenticUser })` or an Agentic User-scoped API client.
4. Used a conversation that belongs to the same tenant and intended Agentic User.

:::caution[Preview implementation]
The proactive sender envelope is under active validation. Verify the serialized sender and resulting Teams identity before using proactive messaging outside development environments.
:::

## Token exchange fails

Check:

- `CLIENT_ID` is the blueprint client ID.
- `CLIENT_SECRET` belongs to the blueprint application.
- `TENANT_ID` is the Agentic User's tenant.
- `agenticAppInstanceId` identifies the concrete instance, not the blueprint.
- `agenticUserId` is the Agentic User's Entra object ID.
- The blueprint is authorized to operate the instance.

The current TypeScript preview supports client credentials or a custom token provider for Agentic User token acquisition. Do not assume that every bot authentication mode also supports Agentic User token exchange.

## Lifecycle handlers do not all run

The router uses middleware-style handler execution in registration order. Register the general handler first and call `ctx.next()` if the matching variant-specific handler should run afterward:

```typescript
app.on('agentLifecycle', async (ctx) => {
  await persistEnvelope(ctx.activity);
  await ctx.next();
});
```

Without `ctx.next()`, the first matching handler completes the route.

## Lifecycle state appears to move backward

Do not use receive order as state order. Compare the lifecycle version when it is present and make updates idempotent. Events with the same version can also represent different property changes.

## A lifecycle property is missing or null

Preview payloads can omit optional fields or send explicit `null` values. Check values before calling string methods or writing them to non-nullable storage columns.

## The package uploads but cannot be found in Teams

Package ingestion and Teams catalog publication are different operations. Confirm that:

- The package was uploaded through the supported Admin Center surface.
- The agent was published to the intended users.
- The resulting instance was activated.
- Tenant preview requirements are satisfied.
- Propagation has completed.

Do not assume that a Microsoft 365 title link also creates a Teams catalog entry.

## Callback requests fail authentication

Confirm that the callback URL exactly matches the registered public HTTPS endpoint and that the runtime validates inbound tokens.

Service URLs are security-sensitive. Do not disable authentication or forward bearer tokens to a service URL supplied by an untrusted caller.
