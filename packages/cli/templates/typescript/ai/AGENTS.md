# Agent Instructions for Teams SDK based agents

This is a Microsoft Teams bot project built with the new Teams SDK and OpenAI integration.

IMPORTANT: To actually run this bot inside a real Microsoft Teams instance, fetch and follow the instructions in the linked AGENTS.md below (comprehensive development guidance, Azure setup instructions, and troubleshooting):

https://raw.githubusercontent.com/microsoft/teams.ts/main/AGENTS_TEMPLATE.md

## Project-Specific Notes

- This bot uses **OpenAI GPT-4o** for chat completions
- Conversation history is stored via **LocalStorage**
- Run with `npm run dev` for local development

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o |
| `CLIENT_ID` | Yes | Azure AD App Registration ID |
| `CLIENT_SECRET` | Yes | Azure AD App client secret |
| `TENANT_ID` | Yes | Azure AD Tenant ID |
