# Local Tunnels for Development

Teams must reach your bot's `/api/messages` endpoint over **public HTTPS**. When developing locally, your server is only reachable on `localhost`, so you need a tunnel — a tool that forwards a public URL to your local port.

For setting up Dev Tunnels or ngrok, the plain-HTTP protocol gotcha, verifying the tunnel actually reaches your app, persistent vs. ephemeral URLs, and security notes on `--allow-anonymous`, see [Local Tunnels](/developer-tools/local-tunnels). This page covers only how a tunnel interacts with the `teams app create`/`update` CLI flow.

## Registering your tunnel URL

Once your tunnel is running, pass its hostname to `--endpoint` when you register the bot:

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

