---
sidebar_position: 1
title: Client Secret Setup
summary: Set up client secret authentication for your Teams bot in Azure Portal or Azure CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Client Secret Authentication Setup

Client Secret authentication is the simplest method, using a password-like secret to authenticate your bot. While easy to set up, secrets need to be rotated periodically and kept secure.

## Prerequisites

Before you begin, ensure you have:
- An Azure subscription
- Permissions to create App Registrations and Azure Bot Services

## Setup Steps

### Step 1: Create Azure Bot with Single Tenant

When creating your Azure Bot Service, you must select `Single Tenant` for the `Type of App`.

![Single Tenant Bot Creation](/screenshots/single-tenant-bot.png)

### Step 2: Create Client Secret

<Tabs>
<TabItem value="portal" label="Azure Portal">

1. Navigate to your **App Registration** in the Azure Portal
2. Go to **Certificates and Secrets**
3. Click **New client secret**
4. Add a description and select an expiration period
5. Click **Add**
6. **Important**: Copy the secret value immediately - it won't be shown again

![Secret in Certificates and Secrets](/screenshots/client-secret.png)

</TabItem>
<TabItem value="cli" label="Azure CLI">

```bash
# Create a new client secret
az ad app credential reset --id $APP_ID --append
```

The command will output the secret value. Save it securely.

</TabItem>
</Tabs>

## Next Steps

After completing the Azure setup, configure your application code with the appropriate environment variables. See the App Authentication Essentials Guide for details.
