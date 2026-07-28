<!-- client-secret-configuration -->

Set the following environment variables in your application:

- `CLIENT_ID`: Your Application (client) ID
- `CLIENT_SECRET`: The client secret value you created
- `TENANT_ID`: The tenant id where your bot is registered

```env
CLIENT_ID=your-client-id-here
CLIENT_SECRET=your-client-secret-here
TENANT_ID=your-tenant-id
```

The SDK will automatically use Client Secret authentication when both `CLIENT_ID` and `CLIENT_SECRET` are provided.

<!-- umi-configuration -->

Your application should automatically use User Assigned Managed Identity authentication when you provide the `CLIENT_ID` environment variable without a `CLIENT_SECRET`.

Set the following environment variables in your application:

- `CLIENT_ID`: Your Application (client) ID
- **Do not set** `CLIENT_SECRET`
- `TENANT_ID`: The tenant id where your bot is registered

```env
CLIENT_ID=your-client-id-here
# Do not set CLIENT_SECRET
TENANT_ID=your-tenant-id
```

<!-- fic-configuration -->

Depending on the type of managed identity you select, set the environment variables accordingly.

**For User Assigned Managed Identity:**

Set the following environment variables:
- `CLIENT_ID`: Your Application (client) ID
- `MANAGED_IDENTITY_CLIENT_ID`: The Client ID for the User Assigned Managed Identity resource
- **Do not set** `CLIENT_SECRET`
- `TENANT_ID`: The tenant id where your bot is registered

```env
CLIENT_ID=your-app-client-id-here
MANAGED_IDENTITY_CLIENT_ID=your-managed-identity-client-id-here
# Do not set CLIENT_SECRET
TENANT_ID=your-tenant-id
```

**For System Assigned Identity:**

Set the following environment variables:
- `CLIENT_ID`: Your Application (client) ID
- `MANAGED_IDENTITY_CLIENT_ID`: `system`
- **Do not set** `CLIENT_SECRET`
- `TENANT_ID`: The tenant id where your bot is registered

```env
CLIENT_ID=your-app-client-id-here
MANAGED_IDENTITY_CLIENT_ID=system
# Do not set CLIENT_SECRET
TENANT_ID=your-tenant-id
```

<!-- custom-route-shared-secret-example -->

```python
# FastAPI dependency: gate a custom route with a shared secret.
async def require_webhook_auth(request: Request) -> None:
    if request.headers.get("authorization") != f"Bearer {os.environ['WEBHOOK_SECRET']}":
        raise HTTPException(status_code=401)
```

<!-- sovereign-cloud-overrides -->

N/A