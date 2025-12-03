---
sidebar_position: 1
summary: Describes how to configure SSO in Teams
---

# SSO Setup

This section describes how to configure the Azure Bot Service (ABS), the Entra App Registration and the Teams manifest to enable Single-Sign-On (SSO) for your Teams app.

## Create the Entra App Registration

You need an Entra ID App Registration to configure the OAuth Connection in Azure Bot Service. This can be the same EntraId app registration you used to configure your ABS resource or a new App created just for this purpose. You can create the App Registration from the Azure portal, or the CLI, the next list summarizes the creation steps from the portal.

1. Use the existing App registration, or Create a new App registration from the [Entra Id](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps) section in the Azure portal. Now you have an Application Id (also known as Client ID) and a Tenant Id.
2. Provide a name for the app registration, select SingleTenant, and for the Redirect URI select the platform Web and add the value `https://token.botframework.com/.auth/web/redirect`

![Entra new app](/screenshots/entra-new-app.png)

3. Add a new client secret. From `Certificates & secrets`, select `Client secrets` and add `New client secret`. Take note of the secret as you will need the value later on this guide.

![Entra client secret](/screenshots/entra-client-secret.png)

4. Configure the API. From `Expose an API`, Click `Add` to Application ID URI and accept the default value that will look like `api://<Your-Application-Id>`. Add the scope `access_as_user` and select who can _consent_.

![Entra oauth scopes](/screenshots/entra-oauth-scopes.png)

5. Authorize the client applications for SSO. To enable the Teams clients, desktop and web, to perform the SSO flow you must add the next client applications to the scope defined before: Teams Desktop `1fec8e78-bce4-4aaf-ab1b-5451cc387264` and Teams Web `5e3ce6c0-2b1f-4285-8d4b-75ee78787346`

![Entra oauth authorize client app](/screenshots/entra-authorize-clientapp.png)

### Configure the Entra App Registration with the CLI

```bash
#!/bin/bash

az ad app update --id $appId --web-redirect-uris "https://token.botframework.com/.auth/web/redirect"
az ad app update --id $appId --identifier-uris "api://$appId"
# TODO: add oauthpermission settings and client applications.
```

## Create the OAuth connection in Azure Bot Service

You need to add a new OAuth connection to your Azure Bot Service resource.

1. From the Bot service resource in the Azure Portal, navigate to `Settings/Configuration` and `Add OAuth Connection settings`.
2. Provide a name for your connection e.g. `graph`, and select the _Service Provider_ `Azure Active Directory v2`
3. Populate the `TenantId`/`ClientId`/`ClientSecret` from the values obtained in the previous section steps 2 and 3. Configure the Token Exchange URL with the Application ID URI configured in step 4, and add the Scopes you need e.g. `User.Read`

![ABS OAuth connection](/screenshots/abs-oauth-connection.png)

### Create the OAuth connection using the Azure CLI

```bash
#!/bin/bash

az bot authsetting create \
  --resource-group $resourceGroup \
  --name $botName \
  -c "graph" \
  --client-id $appId \
  --client-secret $clientSecret \
  --provider-scope-string "User.Read" \
  --service "Aadv2" \
  --parameters "clientId=$appId" "clientSecret=$clientSecret" "tenantId=$tenantId" "tokenExchangeUrl=api://$appId"
```

## Configure the App Manifest

The Teams application manifest needs to be updated to reflect the settings configure above, with the `Application Id` and `Application ID URI`, if not using `devtunnels`, replace the valid domain with the domain hosting your application.

```json
"validDomains": [
    "*.devtunnels.ms",
    "*.botframework.com",
 ],
 "webApplicationInfo": {
    "id": "<Your-Application-Id>",
    "resource": "api://<Your-Application-Id>"
  }
```
