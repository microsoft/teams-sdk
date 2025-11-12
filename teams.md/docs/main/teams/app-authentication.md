---
sidebar_position: 3
summary: Overview of app authentication in Teams SDK applications, using client secrets, user managed identities and federated identity credentials
---
# App Authentication

Your application needs to authenticate to be able to send a message to Teams as your bot. All bots typically have 3 entities at play:

1. Your Application Service (what the SDK helps you write)
2. Your App Registration (a registration of your bot on Azure)
3. An Azure Bot instance in your tenant (the configuration of a "bot" manifestation of your application)

Authentication means your App Service needs the ability to certify that it is _allowed_ to send a message as your Azure Bot. There are 3 main ways of authenticating:

## 1. Client Secret Authentication

The simplest authentication mechanism is to use a Client Secret. This method is simple and akin to using a password. The downside is that, like most passwords, you will need to rotate these occasionally, and there is a risk of your secrets being leaked. This method also makes it easy to test from your personal machine for local development.

Follow these steps to enable client-secret authentication:

When creating your application, you must ensure that you select `Single Tenant` for the `Type of App` when creating your Azure Bot

![Single Tenant Bot Creation](/screenshots/single-tenant-bot.png)

In your App Registration, you can go to `Certificates and Secrets` to create a new secret.

![Secret in Certificates and Secrets](/screenshots/client-secret.png)

In your application, set the `CLIENT_SECRET` environment variable (perhaps through `.env` files or wherever you set environment variables).

## 2. User Managed Identity

This authentication mechanism makes use of a [User-Managed-Identity](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview#managed-identity-types). There is no need to have any secrets that need to be rotated with this method. When your bot is created, a managed identity is created alongside it. You assign this managed-identity to the service that is running your application which allows that VM to authenticate against the app.

Follow these steps to enable User-Managed-Identity authentication:

When creating your application, you must select `User Managed Identity` for the qType of Appq when creating your Azure Bot

![User Managed Identity](/screenshots/umi-auth.png)

In your application, your app should automatically use User-Managed-Identity, as long as you provide `CLIENT_ID` without `CLIENT_SECRET` in your environment variables.

## 3. Federated Identity Credentials

This authentication mechanism uses [Federated Identity Credentials](https://learn.microsoft.com/en-us/graph/api/resources/federatedidentitycredentials-overview?view=graph-rest-1.0) (FIC for short). With FIC, instead of a User-Managed-Identity being created for you, you are able to assign Managed Identities to the App Registration instead.

Follow these steps to enable Federated Identity Credentials authentication:

When creating your application, you must ensure that you select `Single Tenant` for the `Type of App` when creating your Azure Bot

![Single Tenant Bot Creation](/screenshots/single-tenant-bot.png)

In your App Registration, you can go to `Certificates and Secrets` and go into the `Federated Credentials` tab. Here, you are able to assign User-Managed-Identities _or_ System Assigned Identities which you want to allow using your App Registration. The identity you pick here must also be assigned to the VM where your application is hosted.

![Federated Identity Creds](/screenshots/fic.png)

Depending on the type of managed identity you select, you need to set the environment variable in `.env` or wherever you set your environment variables.
  - For User-Managed-Identity, set the value of `MANAGED_IDENTITY_CLIENT_ID` to the Client Id for the User-Managed-Identity resource.
  - For System Assigned Identity, set the value of `MANAGED_IDENTITY_CLIENT_ID` to `system`.
