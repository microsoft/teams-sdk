# Local Tunnels for Development

Teams must reach your bot's `/api/messages` endpoint over **public HTTPS**. When developing locally, your server is only reachable on `localhost`, so you need a tunnel — a tool that forwards a public URL to your local port.

## Why Teams Needs a Tunnel

When a user sends your bot a message, Teams delivers it as an HTTP POST to the messaging endpoint you registered. That endpoint must be:

- **Publicly reachable** — Teams' servers make the request, not the user's browser
- **HTTPS** — Teams rejects plain HTTP endpoints
- **Registered** — the URL must match the one you passed to `teams app create --endpoint`

During local development you satisfy all three with a tunnel.

## Setting Up a Tunnel

### Option 1 — DevTunnels (recommended)

[DevTunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) is Microsoft's tunnel service, integrated into Visual Studio and the Azure CLI. Persistent tunnels keep the same hostname across restarts, which means you only need to run `teams app create` once.

**Install:**

```bash
# macOS / Linux
brew install devtunnel

# Windows (winget)
winget install Microsoft.devtunnel
```

**Create a persistent tunnel:**

```bash
devtunnel user login
devtunnel create --allow-anonymous
devtunnel port create -p 3978
devtunnel host
```

Your tunnel URL looks like `https://<tunnel-id>-3978.devtunnels.ms`. Use this as the `--endpoint` value:

```bash
teams app create \
  --name my-bot \
  --endpoint https://<tunnel-id>-3978.devtunnels.ms/api/messages \
  --env .env
```

Because the hostname is stable across restarts, you can stop and restart your tunnel without re-registering the bot.

### Option 2 — ngrok

[ngrok](https://ngrok.com) is a popular tunnel service that also supports persistent hostnames on paid plans.

**Install:** follow the [ngrok getting started guide](https://ngrok.com/docs/getting-started/).

**Start a tunnel (free tier — hostname changes on restart):**

```bash
ngrok http 3978
```

Your tunnel URL looks like `https://<random-id>.ngrok-free.app`. Copy the `Forwarding` URL and use it:

```bash
teams app create \
  --name my-bot \
  --endpoint https://<random-id>.ngrok-free.app/api/messages \
  --env .env
```

:::caution Free-tier hostname changes
On ngrok's free tier the hostname is regenerated each time you restart `ngrok http`. When this happens, update your bot's messaging endpoint:

```bash
teams app update <teamsAppId> --endpoint https://<new-id>.ngrok-free.app/api/messages
```

A paid ngrok plan (or DevTunnels) gives you a stable hostname to avoid this.
:::

## Restarting vs. Re-registering

Your tunnel must be **running before Teams delivers messages**, but you don't need to re-run `teams app create` every session. The bot registration stores the hostname — as long as the hostname stays the same, restart the tunnel and your server independently as many times as you like.

Only re-run `teams app create` (or `teams app update --endpoint`) when your tunnel URL changes.
