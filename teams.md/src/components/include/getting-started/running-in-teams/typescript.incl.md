<!-- terminal-output -->

```sh
[nodemon] 3.1.9
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/**
[nodemon] watching extensions: ts
[nodemon] starting `node -r ts-node/register -r dotenv/config ./src/index.ts`
[INFO] @teams/app/http listening on port 3978 🚀
```

<!-- run-command -->

```sh
npm install
npm run dev
```

<!-- local-test-tip -->

:::tip
To exercise the agent locally without going through Teams, run the **[Microsoft 365 Agents Playground](/developer-tools/agents-playground)** in a second terminal:

```sh
agentsplayground -e http://localhost:3978/api/messages -c emulator
```

It opens at [http://localhost:56150](http://localhost:56150) and lets you send messages, mock activities, and inspect the wire traffic with your agent.
:::
