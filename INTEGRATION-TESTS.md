# Integration Tests Runbook

Operational guide for provisioning, rotating, and maintaining the Teams SDK integration test infrastructure.

---

## Overview

Integration tests run against live Teams service endpoints using real bot/agentic app registrations on a BAMI test tenant. All three SDKs (C#, TypeScript, Python) share the same Azure resources.

### Current Resources

| Resource | Where to find | Notes |
|----------|---------------|-------|
| BAMI Tenant ID | `.runsettings` / `.env` files (gitignored) | Expires periodically — see [Tenant Renewal](#tenant-renewal) |
| Bot App Registration | Azure Portal → App registrations | Standard bot identity |
| Agentic App Registration | Azure Portal → App registrations | Agentic identity (blueprint model) |
| Test Team/Channel | `.runsettings` / `.env` → `TEST_CONVERSATIONID` | General channel thread ID |
| Test Users | `.runsettings` / `.env` → `TEST_USER_ID`, `TEST_USER_ID_2` | Bot Framework user IDs (29:...) |
| Agentic IDs | `.runsettings` / `.env` → `TEST_AGENTIC_APPID`, `TEST_AGENTIC_USERID` | From Teams Developer Portal |
| Meeting ID | `.runsettings` / `.env` → `TEST_MEETINGID` | Base64-encoded, recurring meeting in test channel |
| OAuth Connection | `aadv2` | For user-token tests (manual only) |

> **Note:** All real IDs, secrets, and tenant-specific values live in gitignored config files (`.runsettings/` for C#, `.env` for TS/PY). Never commit these to the repo.

### Service URLs

| Environment | URL | Used for |
|-------------|-----|----------|
| Prod (tenant-scoped) | `https://smba.trafficmanager.net/amer/{tenantId}/` | botid-prod |
| Prod (global) | `https://smba.trafficmanager.net/teams` | agenticid-prod |
| Canary | `https://canary.botapi.skype.com/amer` | botid-canary, agenticid-canary |

### Auth Scopes

| Identity | Scope | Notes |
|----------|-------|-------|
| Bot (standard) | `https://api.botframework.com/.default` | Default — no explicit scope needed |
| Agentic | `https://botapi.skype.com/.default` | Must set `AzureAd__Scope` in config |

---

## Initial Setup (From Scratch)

Use this when setting up on a **new BAMI tenant** or onboarding a new team member.

### 1. Obtain a BAMI Tenant

BAMI tenants are provisioned via the internal BAMI portal. Request a tenant with:
- At least 3 user accounts (for multi-member conversation tests)
- Teams license enabled on all users
- Admin consent capability

### 2. Register Bot App

```bash
# Login to the BAMI tenant
az login --tenant <TENANT_ID>

# Create the app registration
az ad app create \
  --display-name "integration-tests-bot" \
  --sign-in-audience AzureADMultipleOrgs

# Note the appId from output — this is your AzureAd__ClientId

# Create a client secret
az ad app credential reset \
  --id <APP_ID> \
  --append \
  --display-name "integration-tests" \
  --end-date "<YYYY-MM-DD, e.g. 2 years out>"

# Note the 'password' from output — this is your client secret
```

### 3. Register Bot in Bot Framework

Go to https://dev.botframework.com/bots/new (or use Azure Portal → Bot Services):
1. Create a new Azure Bot resource
2. Set the app ID to the one created above
3. Set messaging endpoint to any HTTPS URL (not used for outbound-only tests)
4. No need for a real endpoint — these tests only make outbound API calls

### 4. Register Agentic App (Optional)

```bash
# Create a second app registration for agentic identity
az ad app create \
  --display-name "integration-tests-agentic" \
  --sign-in-audience AzureADMultipleOrgs

# Create secret
az ad app credential reset \
  --id <AGENTIC_APP_ID> \
  --append \
  --display-name "integration-tests" \
  --end-date "2028-12-31"
```

The agentic app ID and user ID are assigned by the Teams service when the agent is registered. Contact the agentic platform team or use the Teams Developer Portal to register an agent and obtain these IDs.

### 5. Provision Test Data

Using Microsoft Graph API or Teams admin:

```bash
# Install Microsoft Graph CLI (if not already)
# Or use Graph Explorer: https://developer.microsoft.com/graph/graph-explorer

# Create a team
POST https://graph.microsoft.com/v1.0/teams
{
  "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
  "displayName": "SDK Integration Tests",
  "description": "Team for automated integration testing"
}

# Add the bot as a team member (required for team-scoped operations)
# Add at least 2 test users to the team

# Create a channel conversation (or use the General channel)
# The channel thread ID becomes TEST_CONVERSATIONID

# Schedule a recurring meeting in the channel
# The meeting ID (base64-encoded) becomes TEST_MEETINGID

# Install the bot app in the team
POST https://graph.microsoft.com/v1.0/teams/{teamId}/installedApps
{
  "teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/{teamsAppId}"
}
```

### 6. Gather Environment Variables

After provisioning, collect:

| Variable | How to find |
|----------|-------------|
| Tenant ID | Tenant ID from BAMI portal |
| Client ID | App registration → Overview → Application (client) ID |
| Client Secret | From `az ad app credential reset` output |
| Service URL | Use `https://smba.trafficmanager.net/amer/{tenantId}/` for prod |
| Conversation ID | Channel thread ID (19:...@thread.tacv2) |
| User ID | Bot Framework user ID (29:...) — find via Graph or from a bot conversation |
| Team ID | Same as conversation ID for channel-based tests |
| Channel ID | Same as above (General channel) |
| Meeting ID | Base64-encoded meeting thread — from meeting join URL or Graph |
| User ID 2 | Second test user's bot framework ID |

> **Note:** C# uses `AzureAd__TenantId` / `TEST_SERVICEURL` / `TEST_CONVERSATIONID` style (xml runsettings).
> TS/PY use `AZURE_TENANT_ID` / `TEST_SERVICE_URL` / `TEST_CONVERSATION_ID` style (.env files).
> The values are identical — only the key format differs.

### 7. Create Configuration Files

**C# (.runsettings):**
```bash
# Place in teams.net/core/test/IntegrationTests/.runsettings/
# See teams.net/core/test/IntegrationTests/README.md for full template
```

**TypeScript (.env):**
```bash
# Place in teams.ts/test/integration/.env.botid-prod (gitignored)
AZURE_TENANT_ID=<tenantId>
AZURE_CLIENT_ID=<clientId>
AZURE_CLIENT_SECRET=<secret>
TEST_SERVICE_URL=https://smba.trafficmanager.net/amer/<tenantId>/
TEST_CONVERSATION_ID=19:...@thread.tacv2
TEST_USER_ID=29:...
TEST_TEAM_ID=19:...@thread.tacv2
TEST_CHANNEL_ID=19:...@thread.tacv2
TEST_MEETING_ID=MCM...
TEST_TENANT_ID=<tenantId>
```

**Python (.env):**
```bash
# Place in teams.py/tests/integration/.env (gitignored)
# Same format as TypeScript
```

---

## Secret Rotation

Secrets expire. Current secrets expire **2026-12-31**.

### When to rotate
- Secrets approaching expiry (< 30 days)
- Secret suspected compromised
- Team member leaves who had access

### How to rotate

```bash
# Login to the correct tenant
az login --tenant <TENANT_ID>

# Rotate bot app secret (append — don't overwrite existing until all configs updated)
az ad app credential reset \
  --id <BOT_APP_ID> \
  --append \
  --display-name "integration-tests-$(date +%Y%m)" \
  --end-date "2028-12-31"

# Rotate agentic app secret
az ad app credential reset \
  --id <AGENTIC_APP_ID> \
  --append \
  --display-name "integration-tests-$(date +%Y%m)" \
  --end-date "2028-12-31"

# Update all config files:
# 1. teams.net/core/test/IntegrationTests/.runsettings/*.runsettings
# 2. teams.ts/test/integration/.env
# 3. teams.py/tests/integration/.env
# 4. ADO variable group (when pipeline exists)

# After verifying new secret works, delete the old one:
az ad app credential delete --id <APP_ID> --key-id <OLD_KEY_ID>
```

### ADO Variable Group (future)

When the ADO pipeline is set up, secrets will also live in a variable group:
- Org/Project: configured per team (see your ADO pipeline definition)
- Variable group: `teams-sdk-integration-tests` (to be created)

Update both local files AND the variable group during rotation.

---

## Tenant Renewal

BAMI tenants expire. When this happens, **all test identifiers become invalid**.

### Symptoms of expired tenant
- All tests fail with 401 Unauthorized or "tenant not found"
- Azure CLI login fails for the tenant ID
- Bot Framework token endpoint returns errors

### Renewal procedure

1. **Request new BAMI tenant** from internal portal
2. **Re-register apps** (or transfer if possible — usually easier to recreate)
3. **Re-provision test data** (team, channel, users, meeting) — follow [Initial Setup](#initial-setup-from-scratch)
4. **Update all configuration** with new IDs:
   - New tenant ID
   - New app registrations + secrets
   - New conversation/team/channel/meeting IDs
   - New user IDs (bot framework format changes per tenant)
5. **Update ADO variable group**
6. **Run all 4 configs** to verify

### What changes vs what stays the same

| Changes | Stays the same |
|---------|---------------|
| Tenant ID | Service URL format |
| App registration IDs + secrets | Test code |
| Conversation/Team/Channel IDs | Auth flow logic |
| User IDs (29:...) | Skip conditions |
| Meeting ID | Test assertions |

---

## Troubleshooting

### Common failures and remediation

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Expired secret or tenant | Rotate secret or renew tenant |
| 429 Too Many Requests | Calling /members too often | Verify fixture caching is working |
| 403 Forbidden | Bot not installed in team, or wrong scope | Reinstall bot, check service URL |
| 404 Not Found (reactions) | Known canary/agentic limitation | Should be auto-skipped |
| 500 Internal Server Error (targeted) | Known agentic limitation | Should be auto-skipped |
| Empty paged members | Known canary limitation | Should be auto-skipped |
| Browser auth popup | DefaultAzureCredential fallback | Tests should use client credentials only — check config |

### Verifying setup

```bash
# Quick smoke test — just run one test
cd teams.net/core/test
dotnet test IntegrationTests/IntegrationTests.csproj \
  --settings IntegrationTests/.runsettings/botid-prod.runsettings \
  --filter "FullyQualifiedName~SendAndUpdateActivity"

# If this passes, auth and basic connectivity are working
```

---

## When to Add Integration Tests

### Triggers — You MUST add an integration test when:

| Change | Why | Example |
|--------|-----|---------|
| **New API endpoint wrapper** | Validates URL construction, HTTP method, and response parsing against the real service | Adding `meetings.getTranscript()` |
| **Serialization/model change** | Catches field name mismatches, missing aliases, wrong casing on the wire | Renaming a Pydantic field, adding a new `camelCase` property |
| **Auth flow change** | Token acquisition is critical path — silent failures break everything | Changing scope selection logic, adding a new credential type |
| **Header injection logic** | Agentic identity, targeted activities, custom headers must be correct | Modifying `AgenticIdentity.toHeaders()` |
| **HTTP middleware change** | Retry, timeout, or interceptor logic can silently alter requests | Changing retry policy, adding rate-limit handling |
| **Streaming implementation** (TS/PY) | SSE chunk reassembly is complex and has no unit-testable contract | Modifying `StreamingClient` |

### Triggers — You do NOT need an integration test for:

| Change | Why |
|--------|-----|
| Routing/middleware (in-process only) | Covered by unit tests — no network call involved |
| Card builder changes | Pure data construction — unit tests are sufficient |
| Event handler registration | In-memory wiring — no API call |
| Documentation-only changes | No code behavior change |
| Refactoring with no public API change | Existing tests already cover the behavior |

### How to decide: the "wire boundary" rule

> If your change affects **what goes on the wire** (URL, headers, body, auth token) or **how a response is parsed**, add an integration test. If it only affects in-process logic, unit tests are sufficient.

### Cross-SDK scope

Not every test is mirrored across all three languages. The split:

- **Core tests (~12 per SDK)** — shared across C#, TS, and Python. These cover the common API surface: activities (send/update/delete/reply), members (list/get/paged), conversations (create 1:1/group), reactions, and team details. These validate that all three SDKs produce the same wire behavior.
- **Language-specific tests** — only exist in the SDK they're relevant to. Examples: C#'s 13-test conversation creation diagnostic matrix, compat layer error cases, sign-in/token tests. Don't mirror these unless the other SDK has equivalent functionality.

---

## Adding New Tests

### Implementation guidelines

1. **Use the shared fixture** — don't acquire tokens or fetch members in individual tests
2. **Add `Skip.If` for known limitations** — check `IsCanary` and `AgenticIdentity` as appropriate
3. **Keep tests idempotent** — clean up created resources, or use unique names with timestamps
4. **Use `SkippableFact`/`skip` decorators** — so tests can be conditionally disabled without failing CI
5. **Target 5-15s timeout** — integration tests hit real APIs but shouldn't take minutes
6. **Name tests descriptively** — the test name should explain what SDK behavior is being validated, not just the API endpoint

### Test categories

| Category | Description | When to add |
|----------|-------------|-------------|
| API validation | Verify SDK correctly calls the API and parses responses | New API wrapper or serialization change |
| Serialization | Verify wire format (especially Python camelCase) | New model or field alias |
| Streaming | Verify SSE chunk assembly (TS only) | Streaming logic changes |
| Auth | Verify token acquisition works | Auth flow changes |

---

## CI Pipeline (Future)

Target setup for ADO nightly pipeline:

```yaml
# Pseudocode — actual YAML TBD
trigger: none
schedules:
  - cron: "0 6 * * *"  # 6 AM UTC daily

variables:
  - group: teams-sdk-integration-tests

stages:
  - stage: DotNet
    jobs:
      - job: BotProd
        steps:
          - dotnet test --settings botid-prod.runsettings
      - job: AgenticProd
        steps:
          - dotnet test --settings agenticid-prod.runsettings

  - stage: TypeScript
    jobs:
      - job: BotProd
        steps:
          - npm run test:integration

  - stage: Python
    jobs:
      - job: BotProd
        steps:
          - poe test:integration
```

On failure: auto-create ADO work item in the team's configured area path.
