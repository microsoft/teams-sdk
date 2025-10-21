---
sidebar_position: 3
summary:
llms: ignore
---

# Deployment Guide

We cover the most common setup and deployment steps for testing in teams, including configuration instructions, and references for handling potential issues during deployment.

### User Assigned Managed Identity

This section demonstrates how to configure authentication in your application using a **User Assigned Managed Identity** in Azure. You will require this setup if you have `msaAppType: 'UserAssignedMSI'` for the Azure Bot Service (required in dev env generally).

In your `main.py`, replace the initialization:

```python
app = App(plugins=[DevToolsPlugin()])
```

with the following code to enable User Assigned Managed Identity authentication:

```python
# Create token factory function for Azure Identity
def create_token_factory():
    def get_token(scopes, tenant_id=None):
        credential = ManagedIdentityCredential(client_id=os.environ.get("CLIENT_ID"))
        if isinstance(scopes, str):
            scopes_list = [scopes]
        else:
            scopes_list = scopes
        token = credential.get_token(*scopes_list)
        return token.token
    return get_token

app = App(
    token=create_token_factory(),
    plugins=[DevtoolsPlugin()]
)
```

> **Note:** The `ManagedIdentityCredential` class is available in the [`azure-identity`](https://pypi.org/project/azure-identity/) package. Make sure to install it using `pip install azure-identity` and import it in your code.

The `create_token_factory` function provides a method to retrieve access tokens from Azure on demand, and `token_credentials` passes this method to the app.

### Missing Service Principal in the Tenant

This error occurs when the application has a single-tenant Azure Bot Service (`msaAppType: 'SingleTenant'`) instance, but your app registration has not yet been linked to a Service Principal in the tenant.

```sh

```

[ERROR] @teams/app Failed to refresh bot token: Client error '401 Unauthorized' for url 'https://login.microsoftonline.com/aaaabbbb-0000-cccc-1111-dddd2222eeee/oauth2/v2.0/token'
[ERROR] @teams/app For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401

```

1. **Sign in to Azure Portal**
   Go to [https://portal.azure.com](https://portal.azure.com) and log in with your Azure account.
2. **Navigate to App Registrations**
   In the top search bar, search for **App registrations** and select it.
3. **Search for your application**
   Use the **BOT_ID** from your environment file:
   - Local development → `env/.env.local`
   - Azure deployment → `env/.env.dev`
4. **Check if a Service Principal exists**
   Open the app registration and verify if a Service Principal is created. If it exists already, you should see an entry for a **Managed Application in your local directory** if it exists.
    ![Existing Service Principal](/screenshots/existing-service-principal.png)
5. **Create a Service Principal if missing**
   If it doesn’t exist, click **Create Service Principal** . Wait for the page to finish loading.
   ![Create Service Principal](/screenshots/create-service-principal.png)
6. **Restart your app**
   Once the Service Principal is created, restart your application.
```
