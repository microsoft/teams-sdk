<!-- terminal-output -->

```sh
[INFO] Microsoft.Hosting.Lifetime Now listening on: http://localhost:3978
[INFO] Microsoft.Hosting.Lifetime Application started. Press Ctrl+C to shut down.
[INFO] Microsoft.Hosting.Lifetime Hosting environment: Development
```

<!-- run-command -->

```sh
dotnet run
```

<!-- local-test-tip -->

:::tip
To exercise the agent locally without going through Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** in a second terminal:

```sh
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

It opens at [http://localhost:56150](http://localhost:56150) and lets you send messages, mock activities, and inspect the wire traffic with your agent.
:::
