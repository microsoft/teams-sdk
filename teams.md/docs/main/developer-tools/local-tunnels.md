---
sidebar_position: 5
summary: Use Dev Tunnels to expose your local server over public HTTPS so Teams, message extensions, Agent 365, and other inbound webhooks can reach it during development.
---

# Exposing Your Local App with a Tunnel

Teams, Agent 365, and other webhook callers deliver requests from their own servers, not a browser — so your endpoint must be reachable on the public internet over HTTPS, even while developing on `localhost`. A **tunnel** gives your local server a public URL for exactly this: bots, message extensions, Agent 365 callbacks, and any other inbound webhook your app registers. Once you deploy to a real host, you don't need a tunnel.

## Dev Tunnels (recommended)

[Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) is Microsoft's tunneling service, built into Visual Studio, VS Code, and the Microsoft 365 Agents Toolkit. A **persistent tunnel** keeps the same hostname across restarts, so you register your endpoint once.

**Install:**

```bash
# macOS / Linux
brew install devtunnel

# Windows (winget)
winget install Microsoft.devtunnel
```

**Create a persistent, anonymous-access tunnel:**

```bash
devtunnel user login
devtunnel create my-teams-app --allow-anonymous
devtunnel port create my-teams-app -p 3978
devtunnel host my-teams-app
```

Use the printed public URL (always HTTPS) as your `--endpoint`:

```bash
teams app create \
  --name my-bot \
  --endpoint https://my-teams-app-3978.usw2.devtunnels.ms/api/messages \
  --env .env
```

## Alternatives

[ngrok](https://ngrok.com/docs/getting-started) and [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) work the same way: start a tunnel, get a public HTTPS URL, use it as your `--endpoint`. Fine substitutes if you're already using one — see their docs for setup.

## Verifying the tunnel reaches your app

```bash
curl -i https://<your-tunnel-host>/api/messages
```

Any response from your app — even an error like `401` or `404` — confirms the tunnel is forwarding correctly; move on and test from Teams. No response or a `502` means transport is broken — see [Troubleshooting](#troubleshooting).

## Persistent vs. ephemeral URLs

A Dev Tunnels persistent tunnel (`devtunnel create <tunnel-id>`) keeps its hostname across restarts, so you register the endpoint once. ngrok's free tier assigns a new hostname every run, so you must re-register (`teams app update <id> --endpoint ...`) each time — and possibly reinstall the app in Teams if the client cached the old endpoint.

:::warning `--allow-anonymous` makes the tunnel public
Anyone with the URL can reach it — required so Teams (not a Dev Tunnels client) can call your endpoint. It doesn't replace app-level auth: keep JWT/activity validation on, and delete the tunnel (`devtunnel delete <tunnel-id>`) when you're done.
:::

## Managing a persistent Dev Tunnel

```bash
devtunnel host my-teams-app       # start (after the one-time create/port setup above)
# Ctrl+C to stop

devtunnel host my-teams-app       # reuse later — same command, same hostname
devtunnel delete my-teams-app     # delete when no longer needed
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` | Tunnel port protocol doesn't match your app | `devtunnel port delete my-teams-app -p 3978` then recreate with `--protocol http` |
| Teams can't reach bot / install fails | Tunnel not hosting, or `--endpoint` doesn't match current URL | Confirm `devtunnel host` is running; re-check the registered endpoint |
| Worked yesterday, not today | Hostname changed (ngrok) or host process stopped | Re-run the host command; re-register the endpoint if the hostname changed |
| `curl` hangs or times out | Host process isn't running, or wrong port tunneled | Check the port your app actually logged on startup |
| `curl` works, Teams doesn't | Transport is fine; likely an app-auth issue | See [Authentication Troubleshooting](/teams/app-authentication/troubleshooting) |

## Related pages

- Running in Teams: [TypeScript](/typescript/getting-started/running-in-teams) · [C#](/csharp/getting-started/running-in-teams) · [Python](/python/getting-started/running-in-teams) — end-to-end registration and sideload flow
- [Local Tunnels (CLI reference)](/cli/concepts/local-tunnels) — the same setup via `teams app create`/`update`
- [Teams Core Concepts](/teams/core-concepts) — where the tunnel fits among app registration and sideloading
- [Azure Configuration](/teams/azure-configuration) — pointing an Azure Bot resource's messaging endpoint at your tunnel
