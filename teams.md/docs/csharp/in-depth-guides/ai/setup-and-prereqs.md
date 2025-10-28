---
sidebar_position: 1
summary: Prerequisites and setup guide for integrating LLMs into C# Teams SDK applications, including API keys and configuration.
---

# Setup & Prerequisites

There are a few prerequisites to getting started with integrating LLMs into your C# application:

- LLM API Key - To generate messages using an LLM, you will need to have an API Key for the LLM you are using.
  - [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
  - [OpenAI](https://platform.openai.com/)
- **NuGet Package** - Install the Microsoft Teams SDK:
  ```bash
  dotnet add package Microsoft.Teams.AI
  ```
- In your C# application, you should include your keys securely using `appsettings.json` or environment variables

### Azure OpenAI

You will need to deploy a model in Azure OpenAI. [Here](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal#deploy-a-model 'Azure OpenAI Model Deployment Guide') is a guide on how to do this.

Once you have deployed a model, configure your application using `appsettings.json` or `appsettings.Development.json`:

**appsettings.Development.json**
```json
{
  "AzureOpenAIKey": "your-azure-openai-api-key",
  "AzureOpenAIModel": "your-azure-openai-model-deployment-name",
  "AzureOpenAIEndpoint": "https://your-resource.openai.azure.com/"
}
```

**Using configuration in your code:**
```csharp
var azureOpenAIModel = configuration["AzureOpenAIModel"] ??
    throw new InvalidOperationException("AzureOpenAIModel not configured");
var azureOpenAIEndpoint = configuration["AzureOpenAIEndpoint"] ??
    throw new InvalidOperationException("AzureOpenAIEndpoint not configured");
var azureOpenAIKey = configuration["AzureOpenAIKey"] ??
    throw new InvalidOperationException("AzureOpenAIKey not configured");

var azureOpenAI = new AzureOpenAIClient(
    new Uri(azureOpenAIEndpoint),
    new ApiKeyCredential(azureOpenAIKey)
);

var aiModel = new OpenAIChatModel(azureOpenAIModel, azureOpenAI);
```

:::tip
Use `appsettings.Development.json` for local development and keep it in `.gitignore`. For production, use environment variables or Azure Key Vault.
:::

:::info
The Azure OpenAI SDK handles API versioning automatically. You don't need to specify an API version manually.
:::

### OpenAI

You will need to create an OpenAI account and get an API key. [Here](https://platform.openai.com/docs/quickstart/build-your-application 'OpenAI Quickstart Guide') is a guide on how to do this.

Once you have your API key, configure your application:

**appsettings.Development.json**
```json
{
  "OpenAIKey": "sk-your-openai-api-key",
  "OpenAIModel": "gpt-4o"
}
```

**Using configuration in your code:**
```csharp
var openAIKey = configuration["OpenAIKey"] ??
    throw new InvalidOperationException("OpenAIKey not configured");
var openAIModel = configuration["OpenAIModel"] ?? "gpt-4o";

var aiModel = new OpenAIChatModel(openAIModel, openAIKey);
```

:::tip
Use `appsettings.Development.json` for local development and keep it in `.gitignore`. For production, use environment variables or Azure Key Vault.
:::
