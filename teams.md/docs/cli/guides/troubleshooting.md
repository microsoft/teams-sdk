# Troubleshooting

Common issues and fixes for the Teams CLI.

## Login not persisting (WSL / Linux)

**Symptom:** `teams login` succeeds but `teams status` immediately shows "Not logged in."

```bash
$ teams login --device-code
Logged in as user@example.com

$ teams status
⚠ Not logged in
```

**Cause:** The CLI uses MSAL's token cache to persist your session across commands. On WSL, the default MSAL token cache library (`@azure/msal-node-extensions`) uses `libsecret` to store tokens in the system keyring via D-Bus. This silently fails on WSL because there's no persistent keyring daemon running — `libsecret` appears to work within a single process, but data is lost when the process exits.

The CLI detects WSL and uses a direct file-based cache instead, bypassing `libsecret` entirely.

**Fix:** Make sure you're on the latest version:

```bash
teams self-update
```

Then log in again:

```bash
teams login
```

**Debugging:** Run with `--verbose` to confirm WSL detection:

```bash
teams login --verbose
```

You should see `WSL detected, using file-based token cache.` in the output.

**Verifying the fix:** After login, check the cache file has real content (more than a few bytes):

```bash
ls -la ~/.config/teams-cli/msal-cache.json
```

If the file is only 2 bytes (`{}`), the cache isn't persisting — update the CLI or check verbose output.

## Device code flow required over SSH

**Symptom:** `teams login` hangs or fails when running over SSH.

**Cause:** The default login flow tries to open a browser on the local machine. Over SSH there's no browser available.

**Fix:** Use device code flow:

```bash
teams login --device-code
```

This prints a URL and code you can open in any browser.

## Azure CLI tenant mismatch

**Symptom:** Commands that create Azure resources fail with a `TENANT_MISMATCH` error.

```
Error: TENANT_MISMATCH — Your Azure CLI is logged into a different tenant than your Teams login.
```

**Cause:** The CLI validates that your Teams login (MSAL) and Azure CLI (`az`) are targeting the same tenant. A mismatch means Azure resources would be created in the wrong tenant.

**Fix:** Log into the correct tenant in Azure CLI:

```bash
az login --tenant <your-tenant-id>
```

Run `teams status -v` to see both tenant IDs side by side.
