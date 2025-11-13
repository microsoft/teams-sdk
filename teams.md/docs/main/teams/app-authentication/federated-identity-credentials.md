---
sidebar_position: 3
title: Federated Identity Credentials Setup
summary: Set up Federated Identity Credentials authentication for your Teams bot in Azure Portal or Azure CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Federated Identity Credentials Setup

Federated Identity Credentials (FIC) allows you to assign managed identities directly to your App Registration instead of creating a separate User Managed Identity resource.

## Prerequisites

Before you begin, ensure you have:
- An Azure subscription
- Permissions to create App Registrations, Azure Bot Services, and manage identities
- A compute resource where your bot will be hosted (App Service, Container App, VM, etc.)
- Either a User Managed Identity or the ability to use System Assigned Identity

## Setup Steps

### Step 1: Create Azure Bot with Single Tenant

When creating your Azure Bot Service, select `Single Tenant` for the `Type of App`.

![Single Tenant Bot Creation](/screenshots/single-tenant-bot.png)

### Step 2: Configure Federated Credentials

Assign managed identities to your App Registration using Federated Credentials.

<Tabs>
<TabItem value="portal" label="Azure Portal">

1. Navigate to your **App Registration** in the Azure Portal
2. Go to **Certificates and Secrets**
3. Select the **Federated Credentials** tab
4. Click **Add credential**
5. Select the federated credential scenario (e.g., "Customer managed keys")
6. Choose the User Managed Identity or configure for System Assigned Identity
7. Complete the required fields and click **Add**

![Federated Identity Creds](/screenshots/fic.png)

The identity you select here must also be assigned to the compute resource where your application is hosted.

</TabItem>
<TabItem value="cli" label="Azure CLI">

```bash
# Add a federated credential for a user managed identity
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "MyFederatedCredential",
    "issuer": "https://login.microsoftonline.com/'$TENANT_ID'/v2.0",
    "subject": "'$MANAGED_IDENTITY_CLIENT_ID'",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

</TabItem>
</Tabs>

### Step 3: Assign the Managed Identity to Your Compute Resource

The managed identity configured in the federated credential must be assigned to your compute resource.

<Tabs>
<TabItem value="portal" label="Azure Portal">

**For User Managed Identity:**

1. Navigate to your compute resource in the Azure Portal
2. Go to **Identity** section in the left menu
3. Select the **User assigned** tab
4. Click **Add**
5. Select the User Managed Identity you configured in the federated credential
6. Click **Add** to confirm

**For System Assigned Identity:**

1. Navigate to your compute resource in the Azure Portal
2. Go to **Identity** section in the left menu
3. Select the **System assigned** tab
4. Set **Status** to **On**
5. Click **Save**

</TabItem>
<TabItem value="cli" label="Azure CLI">

```bash
# For user managed identity:
az webapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --identities $MANAGED_IDENTITY_RESOURCE_ID

# For system assigned identity:
az webapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
```

</TabItem>
</Tabs>

## Next Steps

After completing the Azure setup, configure your application code with the appropriate environment variables. See the App Authentication Essentials Guide for details.
