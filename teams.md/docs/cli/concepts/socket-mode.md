# Socket Mode

Socket mode lets your Teams SDK application receive bot messages without a public HTTP messaging endpoint or a local tunnel. It is best suited to local bot development; HTTP delivery is recommended for production.

Messaging mode is independent of [bot location](./bot-locations): both Teams-managed and Azure-managed bots support socket mode. Other web content or inbound webhooks your app exposes may still need public HTTPS.

## Requirements

Socket mode is currently available only for new bots. Configuring it requires the caller to be an owner of the bot's Entra app. For service-attributed apps, verify ownership if enabling socket mode fails.

## Creating a socket-mode bot

Create a bot and save its credentials:

```bash
teams app create --name my-bot --messaging-mode socket --env .env
```

For an Azure-managed bot, also provide `--azure` and the required Azure resource options. See [app create](../commands/app/create#messaging-mode) for examples.

Interactive creation offers a messaging-mode choice. Scripted creation defaults to HTTP unless socket mode is explicitly requested. Do not combine `--messaging-mode socket` with `--endpoint`.

The CLI configures the bot registration; it does not start your application. Run your Teams SDK application with the generated credentials.

If enabling socket mode fails, creation still succeeds and the bot falls back to HTTP mode without a messaging endpoint. Do not create the app again: retry socket-mode enablement or configure an HTTP endpoint. JSON creation output includes `socketMode: false` and `socketModeError` when enablement fails.

## Changing and checking the mode

Enable socket mode on an eligible bot:

```bash
teams app update <teamsAppId> --messaging-mode socket
```

Restart your Teams SDK application after changing modes. In JSON output, `app update` includes `needsRestart: true` only when the mode actually changes.

Inspect the configured mode and run diagnostics:

```bash
teams app get <teamsAppId> --json
teams app doctor <teamsAppId>
```

`app get --json` reports `socketMode: true` for sockets, `false` for HTTP, or `null` when the mode is unknown or there is no bot. These commands inspect configuration, not the health of a live socket connection. The doctor does not warn about a missing messaging endpoint when socket mode is enabled, but still probes an endpoint if one is configured.

## Switching to HTTP

Set a public HTTPS endpoint and select HTTP explicitly:

```bash
teams app update <teamsAppId> --messaging-mode http --endpoint https://<host>/api/messages
```

The CLI saves the endpoint before disabling socket mode. Restart your Teams SDK application after the mode changes. To reuse an already-configured endpoint, omit `--endpoint`.

Setting `--endpoint` alone does not switch messaging modes. Once HTTP is configured, subsequent endpoint URL changes only need `--endpoint`. For local HTTP development, see [Local Tunnels](./local-tunnels).
