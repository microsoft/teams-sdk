# Authentication

teams uses Microsoft's MSAL (Microsoft Authentication Library) to authenticate with Microsoft 365. This page explains how auth works and what tokens are used.

## Login

```bash
teams login
```

This starts a **device code flow** — you'll see a code and a URL. Open the URL in your browser, enter the code, and sign in with your Microsoft 365 account.

Your session is cached locally and persists across CLI invocations. You don't need to log in every time.

## Logout

```bash
teams logout
```

Clears your cached session.

## Check Status

```bash
teams status
```

Shows your current login state, including your username and tenant. With `-v`, also shows tenant ID and home account ID.

```bash
teams status -v
```

## Azure CLI Auth

Some operations (Azure bots, OAuth connections, SSO setup) require the Azure CLI. These use your separate Azure CLI login — run `az login` before using these features.

The `teams status` command shows both your M365 login state and your Azure CLI connection status.
