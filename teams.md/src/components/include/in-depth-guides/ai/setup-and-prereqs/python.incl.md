<!-- package-install -->

N/A

<!-- config-method -->

We recommend putting it in an .env file at the root level of your project

<!-- project-structure -->

```
my-app/
|── appPackage/       # Teams app package files
├── src/
│   └── main.py      # Main application code
|── .env              # Environment variables
```

<!-- azure-openai-config -->

Once you have deployed a model, include the following key/values in your `.env` file:

```env
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_MODEL=your-azure-openai-model-deployment-name
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
OPENAI_MODEL=gpt-4  # Optional: defaults to gpt-4o if not specified
```

<!-- additional-notes -->

:::note
**Automatic Environment Variable Loading**: The AI models automatically read these environment variables when initialized. You can also pass these values explicitly as constructor parameters if needed for advanced configurations.

```python
# Automatic (recommended)
model = OpenAICompletionsAIModel(model="your-model-name")

# Explicit (for advanced use cases)
model = OpenAICompletionsAIModel(
    key="your-api-key",
    model="your-model-name",
    azure_endpoint="your-endpoint",  # Azure only
    api_version="your-api-version"   # Azure only
)
```

:::
