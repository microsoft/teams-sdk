---
sidebar_position: 1
summary: Prerequisites and setup guide for integrating LLMs into Teams SDK applications, including API keys and Azure OpenAI configuration.
---

# Setup & Prerequisites

There are a few prerequisites to getting started with integrating LLMs into your application:

- LLM API Key - To generate messages using an LLM, you will need to have an API Key for the LLM you are using.
  - [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
  - [OpenAI](https://platform.openai.com/)
- In your application, you should include your keys in a secure way. We recommend putting it in an .env file at the root level of your project

```
my-app/
|── appPackage/       # Teams app package files
├── src/
│   └── index.ts      # Main application code
|── .env              # Environment variables
```

### Azure OpenAI

You will need to deploy a model in Azure OpenAI. [Here](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal#deploy-a-model 'Azure OpenAI Model Deployment Guide') is a guide on how to do this.

Once you have deployed a model, include the following key/values in your `.env` file:


```env
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=your-azure-openai-model
AZURE_OPENAI_ENDPOINT=you-azure-openai-endpoint
AZURE_OPENAI_API_VERSION=your-azure-openai-api-version
```


:::info
The `AZURE_OPENAI_API_VERSION` is different from the model version. This is a common point of confusion. Look for the API Version [here](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference?WT.mc_id=AZ-MVP-5004796 'Azure OpenAI API Reference')
:::

### OpenAI

You will need to create an OpenAI account and get an API key. [Here](https://platform.openai.com/docs/quickstart/build-your-application 'OpenAI Quickstart Guide') is a guide on how to do this.
Once you have your API key, include the following key/values in your `.env` file:


```env
OPENAI_API_KEY=sk-your-openai-api-key
```

