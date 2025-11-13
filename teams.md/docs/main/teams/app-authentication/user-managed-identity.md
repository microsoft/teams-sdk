---
sidebar_position: 2
title: User Managed Identity Setup
summary: Set up User Managed Identity authentication for your Teams bot in Azure Portal or Azure CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# User Managed Identity Authentication Setup

User Managed Identity authentication eliminates the need for secrets or passwords. A managed identity is created alongside your bot and assigned to your compute resource (App Service, Container App, VM, etc.).

## Prerequisites

Before you begin, ensure you have:
- An Azure subscription
- Permissions to create App Registrations, Azure Bot Services, and manage identities
- A compute resource where your bot will be hosted (App Service, Container App, VM, etc.)

## Setup Steps

### Step 1: Create Azure Bot with User Managed Identity

When creating your Azure Bot Service, select `User Managed Identity` for the `Type of App`.

![User Managed Identity](/screenshots/umi-auth.png)

This will automatically create a User Managed Identity resource alongside your bot.

### Step 2: Assign the Managed Identity to Your Compute Resource

The User Managed Identity created with your bot must be assigned to the service running your application.

<Tabs>
<TabItem value="portal" label="Azure Portal">

1. Navigate to your compute resource (App Service, Container App, VM, etc.) in the Azure Portal
2. Go to **Identity** section in the left menu
3. Select the **User assigned** tab
4. Click **Add**
5. Select the User Managed Identity that was created with your Azure Bot
6. Click **Add** to confirm

</TabItem>
<TabItem value="cli" label="Azure CLI">

```bash
# Assign user managed identity to your compute resource
# Example for App Service:
az webapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --identities $MANAGED_IDENTITY_RESOURCE_ID

# Example for Container App:
az containerapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --user-assigned $MANAGED_IDENTITY_RESOURCE_ID
```

</TabItem>
</Tabs>

## Next Steps

After completing the Azure setup, configure your application code with the appropriate environment variables. See the App Authentication Essentials Guide for details.
