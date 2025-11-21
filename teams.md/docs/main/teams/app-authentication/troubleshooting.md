---
sidebar_position: 4
title: Troubleshooting
summary: Common authentication errors and how to resolve them
llms: ignore
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Authentication Troubleshooting

This guide covers common authentication errors and their solutions.

## Missing Service Principal in the Tenant

This error occurs when the application has a single-tenant Azure Bot Service (`msaAppType: 'SingleTenant'`) instance, but your app registration has not yet been linked to a Service Principal in the tenant.

### Error Examples

<Tabs>
<TabItem value="typescript" label="TypeScript">

```sh
[ERROR] @teams/app Request failed with status code 401
[ERROR] @teams/app /aaaabbbb-0000-cccc-1111-dddd2222eeee/oauth2/v2.0/token
[ERROR] @teams/app {
[ERROR] @teams/app   "error": "invalid_client",
[ERROR] @teams/app   "error_description": "AADSTS7000229: The client application 00001111-aaaa-2222-bbbb-3333cccc4444 is missing service principal in the tenant aaaabbbb-0000-cccc-1111-dddd2222eeee. See instructions here: https://go.microsoft.com/fwlink/?linkid=2225119 Trace ID: 0000aaaa-11bb-cccc-dd22-eeeeee333333 Correlation ID: aaaa0000-bb11-2222-33cc-444444dddddd Timestamp: 2025-09-18 01:17:37Z",
[ERROR] @teams/app   "error_codes": [
[ERROR] @teams/app     7000229
[ERROR] @teams/app   ],
[ERROR] @teams/app   "timestamp": "2025-09-18 01:17:37Z",
[ERROR] @teams/app   "trace_id": "0000aaaa-11bb-cccc-dd22-eeeeee333333",
[ERROR] @teams/app   "correlation_id": "aaaa0000-bb11-2222-33cc-444444dddddd",
[ERROR] @teams/app   "error_uri": "https://login.microsoftonline.com/error?code=7000229"
[ERROR] @teams/app }
```

</TabItem>
<TabItem value="python" label="Python">

```sh
[ERROR] @teams/app Failed to refresh bot token: Client error '401 Unauthorized' for url 'https://login.microsoftonline.com/aaaabbbb-0000-cccc-1111-dddd2222eeee/oauth2/v2.0/token'
[ERROR] @teams/app For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
```

</TabItem>
<TabItem value="csharp" label="C#">

```sh
[ERROR] Echobot Failed to get bot token on app startup.
[ERROR] Echobot {
[ERROR] Echobot   "error": "invalid_client",
[ERROR] Echobot   "error_description": "AADSTS7000229: The client application 00001111-aaaa-2222-bbbb-3333cccc4444 is missing service principal in the tenant aaaabbbb-0000-cccc-1111-dddd2222eeee. See instructions here: https://go.microsoft.com/fwlink/?linkid=2225119 Trace ID: 0000aaaa-11bb-cccc-dd22-eeeeee333333 Correlation ID: aaaa0000-bb11-2222-33cc-444444dddddd Timestamp: 2025-09-18 02:26:20Z",
[ERROR] Echobot   "error_codes": [
[ERROR] Echobot     7000229
[ERROR] Echobot   ],
[ERROR] Echobot   "timestamp": "2025-09-18 02:26:20Z",
[ERROR] Echobot   "trace_id": "0000aaaa-11bb-cccc-dd22-eeeeee333333",
[ERROR] Echobot   "correlation_id": "aaaa0000-bb11-2222-33cc-444444dddddd",
[ERROR] Echobot   "error_uri": "https://login.microsoftonline.com/error?code=7000229"
[ERROR] Echobot }
```

</TabItem>
</Tabs>

### Solution

1. **Sign in to Azure Portal**
   Go to [https://portal.azure.com](https://portal.azure.com) and log in with your Azure account.

2. **Navigate to App Registrations**
   In the top search bar, search for **App registrations** and select it.

3. **Search for your application**
   Use the **BOT_ID** from your environment file:
   - Local development → `env/.env.local`
   - Azure deployment → `env/.env.dev`

4. **Check if a Service Principal exists**
   Open the app registration and verify if a Service Principal is created. If it exists already, you should see an entry for a **Managed Application in your local directory**.

   ![Screenshot of App Registrations pane in Azure Portal showing value of 'Graphlocal' under the 'Managed application in local directory' field.](/screenshots/existing-service-principal.png)

5. **Create a Service Principal if missing**
   If it doesn't exist, click **Create Service Principal**. Wait for the page to finish loading.

   ![Screenshot of App Registrations pane in Azure Portal showing value of 'Create Service Principal' under the 'Managed application in local directory' field.](/screenshots/create-service-principal.png)

6. **Restart your app**
   Once the Service Principal is created, restart your application.
