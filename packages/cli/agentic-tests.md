# Agentic Tests

Smoke tests to run before creating a PR. Each test follows setup/act/assert.

Always run from the local build, not the global `teams` command:

```
node dist/index.js <command>
```

## 1. `login` prompts or confirms login

**Setup:** `npm run build`
**Act:** Run `node dist/index.js login`
**Assert:** Either prompts for login (device code flow) OR shows that you're already logged in.

## 2. `apps` lists apps

**Setup:** `npm run build` and be logged in
**Act:** Run `node dist/index.js apps`
**Assert:** Outputs a list of apps (may be empty list, but should not error).

## 3. `--help --json` outputs structured command tree

**Setup:** `npm run build`
**Act:** Run `node dist/index.js --help --json`
**Assert:** Outputs valid JSON with `name` ("teams"), `version`, and a non-empty `commands` array. No non-JSON text in output.
