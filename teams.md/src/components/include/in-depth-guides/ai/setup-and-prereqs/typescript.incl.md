<!-- package-install -->

Install the required AI packages to your application:

```bash
npm install @microsoft/teams.apps @microsoft/teams.ai @microsoft/teams.openai
```

For development, you may also want to install the DevTools plugin:

```bash
npm install @microsoft/teams.dev --save-dev
```

<!-- config-method -->

We recommend putting it in an .env file at the root level of your project

<!-- project-structure -->

```
my-app/
|── appPackage/       # Teams app package files
├── src/
│   └── index.ts      # Main application code
|── .env              # Environment variables
```

<!-- azure-openai-config -->

Once you have deployed a model, include the following key/values in your `.env` file:

```env
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=your-azure-openai-model
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_API_VERSION=your-azure-openai-api-version
```

<!-- azure-openai-info -->

:::info
The `AZURE_OPENAI_API_VERSION` is different from the model version. This is a common point of confusion. Look for the API Version [here](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference?WT.mc_id=AZ-MVP-5004796 'Azure OpenAI API Reference')
:::

<!-- openai-config -->

Once you have your API key, include the following key/values in your `.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

<!-- additional-notes -->

:::note
**Automatic Environment Variable Loading**: The OpenAI model automatically reads environment variables when options are not explicitly provided. You can pass values explicitly as constructor parameters if needed for advanced configurations.

```typescript
// Automatic (recommended) - uses environment variables
const model = new OpenAIChatModel({
  model: 'gpt-4o',
});

// Explicit (for advanced use cases)
const model = new OpenAIChatModel({
  apiKey: 'your-api-key',
  model: 'gpt-4o',
  endpoint: 'your-endpoint',      // Azure only
  apiVersion: 'your-api-version', // Azure only
  baseUrl: 'your-base-url',       // Custom base URL
  organization: 'your-org-id',    // Optional
  project: 'your-project-id',     // Optional
});
```

**Environment variables automatically loaded:**
- `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT` (Azure only)
- `OPENAI_API_VERSION` (Azure only)

:::
