<!-- prerequisites -->

- **Python** v3.12 or higher. Install or upgrade from [python.org/downloads](https://www.python.org/downloads/).
- **UV** v0.8.11 or higher. Install or upgrade from [https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/)

import Admonition from '@theme/Admonition';

<Admonition type="info">
UV is a fast Python package installer and resolver. While you can use other package managers like pip, UV provides better performance and dependency resolution for Teams SDK projects.
</Admonition>

<!-- create-command -->

```sh
npx @microsoft/teams.cli@latest new python quote-agent --template echo
```

<!-- create-explanation -->

1. Creates a new directory called `quote-agent`.
2. Bootstraps the echo agent template files into it under `quote-agent/src`.
3. Creates your agent's manifest files, including a `manifest.json` file and placeholder icons in the `quote-agent/appPackage` directory. The Teams [app manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema) is required for [sideloading](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload) the app into Teams.

<!-- running-steps -->

Navigate to your new agent's directory:

```sh
cd quote-agent
```

Start the development server:

```sh
uv run src\main.py
```

<!-- console-output -->

In the console, you should see a similar output:

```sh
[INFO] @teams/app Successfully initialized all plugins
[WARNING] @teams/app.DevToolsPlugin ⚠️ Devtools is not secure and should not be used in production environments ⚠️
[INFO] @teams/app.HttpPlugin Starting HTTP server on port 3978
INFO:     Started server process [6436]
INFO:     Waiting for application startup.
[INFO] @teams/app.DevToolsPlugin available at http://localhost:3979/devtools
[INFO] @teams/app.HttpPlugin listening on port 3978 🚀
[INFO] @teams/app Teams app started successfully
[INFO] @teams/app.DevToolsPlugin listening on port 3979 🚀
INFO:     Application startup complete..
INFO:     Uvicorn running on http://0.0.0.0:3979 (Press CTRL+C to quit)
```
