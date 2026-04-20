<!-- adding-custom-domains -->

Via `appsettings.json`:

```json
{
  "Teams": {
    "AdditionalAllowedDomains": ["api.my-custom-channel.com"]
  }
}
```

<!-- disabling-validation -->

Via `appsettings.json`:

```json
{
  "Teams": {
    "AdditionalAllowedDomains": ["*"]
  }
}
```
