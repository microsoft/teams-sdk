<!-- terminal-output -->

```sh
[INFO] @teams/app Successfully initialized all plugins
[INFO] @teams/app.HttpPlugin Starting HTTP server on port 3978
INFO:     Started server process [6436]
INFO:     Waiting for application startup.
[INFO] @teams/app.HttpPlugin listening on port 3978 🚀
[INFO] @teams/app Teams app started successfully
INFO:     Application startup complete..
INFO:     Uvicorn running on http://0.0.0.0:3978 (Press CTRL+C to quit)
```

<!-- run-command -->

```sh
pip install -e .
python src/main.py
```

<!-- local-test-tip -->

:::tip
To exercise the agent locally without going through Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** in a second terminal:

```sh
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

It opens at [http://localhost:56150](http://localhost:56150) and lets you send messages, mock activities, and inspect the wire traffic with your agent.
:::
