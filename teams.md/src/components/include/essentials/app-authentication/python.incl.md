<!-- configure-application -->

Your application should automatically use User Managed Identity authentication when you provide the `CLIENT_ID` environment variable without a `CLIENT_SECRET`.

## Configuration

Set the following environment variables in your application:

- `CLIENT_ID`: Your Application (client) ID
- **Do not set** `CLIENT_SECRET`
- `TENANT_ID`: The tenant id where your bot is registered

```env
CLIENT_ID=your-client-id-here
# Do not set CLIENT_SECRET
TENANT_ID=your-tenant-id
```

<!-- availability-note -->

N/A
