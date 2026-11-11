# Porting a Slack Bolt Bot to the Teams SDK

Port a Slack Bolt bot (any language) to the Teams SDK, or set up Teams infra from a Slack manifest alone: read the source (or manifest), look up each Slack concept against the installed Teams SDK's own source/types to find its current equivalent (if any), present a diff.

**Ground truth:** the installed `@microsoft/teams.*` (TS) / `microsoft-teams` (Python) / `Microsoft.Teams.*` (C#) package's own types/source, or `https://microsoft.github.io/teams-sdk/llms_docs/llms_typescript_full.txt` (swap language). For Bolt: the installed package's types/source, or `https://github.com/slackapi/bolt-js` (swap for `bolt-python` etc.).

## Steps

**If there's no Bolt code to port — just a Slack manifest — skip straight to "Optional: Teams infra setup" below using that manifest.**

1. Find every Bolt import/handler/Block Kit usage in the project, and summarize what the app does **as bullet points** (purpose, triggers, key behaviors) before porting anything.
   - Ask if a Slack app manifest is available (optional).
   - If provided, use its scopes/features (commands, interactivity, Socket Mode, OAuth scopes) to inform both the port and the Teams app's infra requirements below (manifest capabilities, permissions, OAuth connection scopes).
2. Ask the target language — only TypeScript, Python, or .NET (C#) are supported.
   - Always ask, suggesting the matching default (e.g. Bolt JS → TypeScript) — don't assume it without confirming.
3. Confirm the output folder for the ported code.
   - Default to a new folder in the same directory as the source (don't overwrite the source in place), but ask before creating it.
4. Install the Teams SDK package(s) (+ cards package if Block Kit is used).
5. Present the migration plan **as bullet points** and get approval before writing any files.
   - State what's being ported to what, verified against the installed Teams SDK's own source/types (not docs/markdown).
   - Call out anything with no confirmed equivalent.
   - Wait for the user to confirm before proceeding.
6. Rewrite file-by-file.
   - Port each Slack concept to its current Teams SDK equivalent — verify each against source before using it.
   - If no equivalent exists, or you can't confirm one, flag it to the user directly rather than guessing.
   - Keep reply copy's original wording verbatim unless the API shape forces a change (e.g. mention syntax) — diff original vs. ported strings before presenting.
   - Ported files (including the README) must read as a native Teams app: strip all Slack/Bolt references, the original app's name/branding, and any migration commentary.
7. Always ask if they want Teams infra set up (see below) — only after the diff is accepted.

---

## Optional: Teams infra setup

Ask the user yes/no after the diff is accepted (or immediately, if there's no code port — see above) — don't assume they want this.

**If they already have a Teams app:**
- Ask only for the client ID (look up endpoint/tenant via `teams app get <id> --json`/`teams status`)
- Ask if they have an existing secret to reuse, or generate a new one via `teams app auth secret create`
- If the looked-up endpoint is a devtunnel URL, check `devtunnel list` (not `devtunnel show <hostname-id>` — hostname and management ID can differ, so this can false-negative) to see if it's still live, and reuse it rather than creating a new tunnel

**If not:** create one per `guide-create-bot-infra.md`.

**Either way, before doing anything:**
- Present the infra plan as bullet points — what will be created/looked up, and which manifest/permissions changes below apply — and get approval. Only proceed once confirmed.
- Re-apply every ported concept that implies a manifest/permissions change (commands → command definitions, user-level OAuth → OAuth connection + Graph/API permissions on the Azure Bot resource via `guide-setup-sso.md`, install scope → declared scopes) — don't leave an existing app's defaults unexamined or a new app bare-bones
- If a Slack manifest was provided in step 1, cross-check its scopes/features against what the Teams manifest currently declares and add what's missing

---

## Optional: live Teams-side verification

Ask the user yes/no separately, after Teams infra is set up — this is a distinct opt-in from infra setup above, not automatic once credentials exist.

**This rule applies regardless of technique** (scripted Activity POST, a real test suite, a one-off manual send, etc.): before any action that causes something to appear/change in Teams, tell the user what's about to happen and what they should see as a result — one action at a time, not batched into a single after-the-fact summary. E.g. "Triggering the button-click handler — you should see the card update now" or "Sending a test notification — you should see a new message in the chat now."

- Bootstrap one real conversation with **one manual message from the user** first.
- **Verifying a ported trigger (slash command, reaction, button click, etc.) requires exercising the inbound dispatch** — the actual migrated handler firing. Only two things prove that: the user performing the real action in Teams, or a scripted Activity POST (reusing the bootstrapped conversation's exact `conversation.id` + `serviceUrl`) with `DANGEROUSLY_ALLOW_UNAUTHENTICATED_REQUESTS=true` locally to simulate the inbound webhook.
- **Ask the user upfront which they want for the whole session** — them performing each trigger manually in Teams, or the agent driving every trigger via scripted POSTs.
   - The scripted input itself never appears in Teams — only the bot's resulting send does, since the POST only simulates the inbound webhook and never touches Teams' real pipeline. Make sure the user knows this so they don't expect to see the simulated input as a message bubble.
- Confirm results via response bodies or Graph `GET /chats/{id}/messages`, not a browser.

**The SDK logs errors but not successful sends** — clean logs aren't proof of delivery. Confirm via a response body (e.g. `task/fetch`/`task/submit` return the card JSON) or Graph `GET /chats/{id}/messages`; if neither is available, ask the user to confirm it landed — don't claim success on log silence.

**Never assume a response shape** (e.g. that `send()` returns an activity `id`) — check ground truth first. If a check's assumption turns out wrong, that's a limitation of the check, not a failed send: treat it as inconclusive and ask the user.

**For transient inconclusiveness (timing, network), retry once before asking the user.** A wrong response-shape assumption won't be fixed by retrying — go straight to asking.

**Checkpoint:** when the port (and any infra/verification the user opted into) is done, ask whether the app works as expected or if anything needs to change — don't assume completion.
