<!-- package-install -->

**NuGet Package** - Install the Microsoft Teams SDK:

```bash
dotnet add package Microsoft.Teams.AI
```

<!-- config-method -->

You should include your keys securely using `appsettings.json` or environment variables

<!-- project-structure -->

N/A

<!-- azure-openai-config -->

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

<!-- azure-openai-info -->

:::info
The Azure OpenAI SDK handles API versioning automatically. You don't need to specify an API version manually.
:::

<!-- openai-config -->

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

<!-- additional-notes -->

N/A
