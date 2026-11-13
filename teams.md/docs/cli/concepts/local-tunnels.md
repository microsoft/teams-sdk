# Local Tunnels for Development

In **HTTP mode**, Teams must reach your bot's `/api/messages` endpoint over **public HTTPS**. When developing locally, your server is only reachable on `localhost`, so HTTP delivery needs a tunnel — a tool that forwards a public URL to your local port.

For bot messaging without a tunnel, use socket mode instead:

```bash
teams app create --name my-bot --messaging-mode socket --env .env
```

Socket mode works with Teams-managed and Azure bots, subject to the [current availability requirements](../commands/app/create#messaging-mode). It removes the public endpoint requirement for bot messages, not for other web content or inbound webhooks your app exposes.

For setting up Dev Tunnels or ngrok, the plain-HTTP protocol gotcha, verifying the tunnel actually reaches your app, persistent vs. ephemeral URLs, and security notes on `--allow-anonymous`, see [Local Tunnels](/developer-tools/local-tunnels). This page covers only how a tunnel interacts with the `teams app create`/`update` CLI flow.

## Registering your tunnel URL

Once your tunnel is running, pass its full messaging URL to `--endpoint` when you register an HTTP bot:

```bash
teams app create \
  --name my-bot \
  --endpoint https://<tunnel-host>/api/messages \
  --env .env
```

With a **Dev Tunnels persistent tunnel**, the hostname stays the same across restarts, so you only run this once. Stop and restart your tunnel and server as often as you like without touching the registration.

With **ngrok's free tier**, the hostname changes every time you run `ngrok http`. Whenever that happens, update the registration instead of re-creating it:

```bash
teams app update <teamsAppId> --endpoint https://<new-host>/api/messages
```

Only re-run `teams app create` (or `teams app update --endpoint`) when your tunnel URL actually changes — the bot registration just stores the hostname, it doesn't care how many times you've restarted the tunnel or server in between.

## Switching from socket mode to a tunnel

Setting `--endpoint` alone does not disable socket mode. Select HTTP explicitly when switching delivery modes:

```bash
teams app update <teamsAppId> --messaging-mode http --endpoint https://<tunnel-host>/api/messages
```

The CLI saves the endpoint before switching to HTTP. Restart your Teams SDK application after the mode changes. Once HTTP mode is configured, subsequent tunnel URL changes only need `--endpoint`.

