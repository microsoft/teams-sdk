## Advanced: Per-Endpoint Overrides (C# only)

For scenarios requiring customization of individual endpoints — such as China single-tenant bots that need a tenant-specific login URL — C# supports per-endpoint overrides in `appsettings.json`:

```json
{
  "Teams": {
    "Cloud": "China",
    "LoginTenant": "your-tenant-id"
  }
}
```

Available override properties: `LoginEndpoint`, `LoginTenant`, `BotScope`, `TokenServiceUrl`, `OpenIdMetadataUrl`, `TokenIssuer`, `ChannelService`, `OAuthRedirectUrl`

TypeScript and Python support the same overrides programmatically via the `withOverrides()` / `with_overrides()` functions.
