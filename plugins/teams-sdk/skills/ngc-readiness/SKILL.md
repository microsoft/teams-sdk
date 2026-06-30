---
name: ngc-readiness
description: >
  Audit an existing Microsoft Teams app codebase for New Gen Channels (NGC)
  readiness — whether the app works correctly in shared and private channels.
  Scans the code against NGC rules and generates a structured NGC Channel
  Readiness Report. Use whenever the user wants to scan, audit, assess, validate,
  or check a Teams app for shared/private channel (NGC) compatibility, or asks to
  generate an NGC readiness report. Trigger phrases include "NGC readiness report",
  "Generate a report for NGC readiness", "Scan for issues related to NGC",
  "is my Teams app ready for shared/private channels", "shared channel
  compatibility check". This is the validate/migrate counterpart to the teams-dev
  skill (which builds and configures apps) — defer here for readiness audits.
  Arguments: FOLDERS to scan. If omitted, scan the current folder.
---
You are an expert Microsoft Teams platform engineer. Your job is to scan this codebase and produce a **NGC Channel Readiness Report** — a structured assessment of whether this Teams app is ready to work in shared and private channels (New Gen Channels).

> **Part of the Teams SDK developer toolkit.** This skill is the **validation / migration** counterpart to the **teams-dev** skill in this same plugin: use `teams-dev` to *build, configure, integrate, and debug* Teams apps; use this skill to *audit an existing app for New Gen Channels (shared & private channels) readiness*. The two are intentionally separate so each stays focused — building vs. validating.

## Argument Parsing

Parse `$ARGUMENTS` before starting:
- The **folders to scan** is `$ARGUMENTS` as a space separated list of folders. If no folder is given, scan the current directory.

---

# NGC Channel Readiness Rules

> **NGC** = New Gen Channels (Shared and Private channels in Microsoft Teams)
> These rules define what every Teams app must comply with to work correctly in shared and private channels.
> References:
> - [Build apps for shared and private channels](https://learn.microsoft.com/en-us/microsoftteams/platform/build-apps-for-shared-private-channels)
> - [Graph API: channel resource](https://learn.microsoft.com/en-us/graph/api/resources/channel?view=graph-rest-1.0)
> - [Graph API: allMembers](https://learn.microsoft.com/en-us/graph/api/channel-list-allmembers?view=graph-rest-1.0)
> - [Graph API: filesFolder](https://learn.microsoft.com/en-us/graph/api/channel-get-filesfolder?view=graph-rest-1.0)
> - [Graph API: channel membership change notifications](https://learn.microsoft.com/en-us/graph/teams-changenotifications-channelmembership)
> - [Teams SDK (.NET)](https://learn.microsoft.com/en-us/dotnet/api/microsoft.teams.apps?view=msteams-sdk-dotnet-latest)
> - [Teams SDK (TypeScript)](https://learn.microsoft.com/en-us/javascript/api/teams-sdk-typescript/?view=msteams-sdk-ts-latest)

## Rule Categories

| ID | Category | Description |
|----|----------|-------------|
| [MAN](#man--manifest-rules) | Manifest | App manifest declarations required for NGC |
| [MEM](#mem--membership-rules) | Membership | Correct use of channel membership APIs |
| [FS](#fs--file--sharepoint-rules) | File & SharePoint | Channel-scoped file and drive access |
| [BOT](#bot--bot--messaging-rules) | Bot & Messaging | Bot installation, events, and proactive messaging |
| [AUTH](#auth--authentication--external-user-rules) | Auth & External Users | Cross-tenant auth and external user handling |
| [DATA](#data--data-scoping-rules) | Data Scoping | Preventing cross-channel data leaks |
| [SUB](#sub--graph-subscription-rules) | Graph Subscriptions | Correct subscription configuration for membership changes |
| [CTX](#ctx--context-api-rules) | Context API | Using getContext() correctly for NGC |

---

## MAN — Manifest Rules

### MAN-1 · Declare `supportsChannelFeatures`
**Severity: CRITICAL**

Add `supportsChannelFeatures` with value `tier1` to your app manifest (v1.25+) to make the app available in shared and private channels.

```json
{
  "manifestVersion": "1.25",
  "supportsChannelFeatures": "tier1"
}
```

**If missing:** The app will not appear in the channel app picker. Users cannot install it in shared or private channels.

**Notes:**
- `tier1` has no dependency on classic or admin-level access controls.
- Message extension–only apps scoped to personal use do not require this flag.

---

### MAN-2 · Declare RSC permissions when using channel membership or file APIs
**Severity: HIGH**

RSC permissions are **conditional** — only required if the app actually calls the relevant Graph APIs. Do not flag these as violations unless the code scan (Step 3) confirms the app uses the corresponding APIs.

- **`ChannelMember.Read.Group`** — required only if the app calls `allMembers`, `members`, or any channel membership Graph API using RSC (not service auth with delegated permissions).
- **`File.Read.Group`** — required only if the app calls `filesFolder` or accesses channel files via Graph API using RSC.

```json
{
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {
          "name": "ChannelMember.Read.Group",
          "type": "Application"
        },
        {
          "name": "File.Read.Group",
          "type": "Application"
        }
      ]
    }
  }
}
```

**If missing when required:** Channel membership API calls return 403. File API calls return 403 for RSC-only apps.

**If the app uses service-level auth (client credentials, OBO with delegated Graph permissions) instead of RSC:** These manifest entries are not required.

---

## MEM — Membership Rules

### MEM-1 · Never assume team membership = channel membership
**Severity: CRITICAL**

Do not use `/teams/{team-id}/members` or AAD group membership (`/groups/{group-id}/members`) to infer who is in a channel.

**What breaks:**
- Tasks assigned to users who are not in the channel.
- User pickers showing people who cannot see the channel.
- Mentions sent to users without channel access.
- External-only channel members are missed entirely.

**Correct approach:** Always use the channel-scoped `allMembers` API:
```http
GET /teams/{team-id}/channels/{channel-id}/allMembers
```

---

### MEM-2 · Use `allMembers` API — not `members` — for channel roster
**Severity: CRITICAL**

`/channels/{id}/members` returns **only directly added members**. Use `allMembers` to include both direct and indirect members (users who joined via a shared team).

```http
GET /teams/{team-id}/channels/{channel-id}/allMembers
```

**Direct vs. Indirect members:**
- **Direct:** Explicitly added to the channel (including cross-tenant users).
- **Indirect:** Members of a team that the channel is shared with. These are identified by the `@microsoft.graph.originalSourceMembershipUrl` annotation pointing to their source team.

**SDK equivalents — scan for VIOLATIONS (`.Members` instead of `.AllMembers`):**

| Language | Violation (direct only) | Correct (all members) |
|----------|------------------------|----------------------|
| C# (Graph SDK) | `graphClient.Teams[id].Channels[id].Members.GetAsync()` | `graphClient.Teams[id].Channels[id].AllMembers.GetAsync()` |
| JavaScript | `client.api('/teams/.../channels/.../members').get()` | `client.api('/teams/.../channels/.../allMembers').get()` |
| Java | `graphClient.teams().byTeamId(id).channels().byChannelId(id).members().get()` | `...allMembers().get()` |
| Python | `graph_client.teams.by_team_id(id).channels.by_channel_id(id).members.get()` | `...all_members.get()` |
| Teams SDK (.NET new) | `context.Api.Teams[id].Channels[id].Members.GetAsync()` | `...AllMembers.GetAsync()` |
| Teams SDK (TS new) | `app.api.teams(id).channels(id).members.get()` | `...allMembers.get()` |

---

### MEM-3 · Check `doesUserHaveAccess` before acting on member-removed events
**Severity: HIGH**

When a `member removed` notification arrives for an indirect member, the user may still have access via a direct membership path. Always verify before revoking:

```http
GET /teams/{team-id}/channels/{channel-id}/doesUserHaveAccess(userId='@userid',tenantId='@TenantID',userPrincipalName='@UserPrincipalName')
```

**If skipped:** Users are incorrectly treated as removed when they still have channel access via a different path.

---

### MEM-4 · Do not assume "everyone in the team" can see every channel
**Severity: HIGH**

Private channels are restricted subsets of the team. Shared channels may include members from entirely different teams or tenants. Team-wide "add all" or "notify all" flows must not use team membership as a proxy for channel visibility. Always rely on `allMembers` API.

```http
GET /teams/{team-id}/channels/{channel-id}/allMembers
```

---

### MEM-5 · Use `hostTeamGroupID` (not `groupId`) as `team-id` in membership API calls
**Severity: CRITICAL**

In a shared or private channel, `getContext()` returns two channel-specific properties:
- `hostTeamGroupID` — the AAD group ID of the **host team** that owns the channel
- `hostTenantID` — the tenant ID of the host team

The plain `groupId` from `getContext()` is the group ID of the team the user is currently navigated under, which in a shared channel may be a **different team** than the one hosting the channel. Using `groupId` as the `team-id` in Graph calls targets the wrong team and returns incorrect or empty membership.

**Incorrect (shared/private channel context):**
```js
const context = await microsoftTeams.app.getContext();
const teamId = context.team.groupId; // ❌ may be the wrong team in shared channels
```

**Correct:**
```js
const context = await microsoftTeams.app.getContext();
const teamId = context.hostTeamGroupID; // ✅ always the channel's host team
const channelId = context.channel.id;
// GET /teams/{teamId}/channels/{channelId}/allMembers
```

**For bots:** Use `turnContext.Activity.GetChannelData<TeamsChannelData>()?.Team?.Id` or `turnContext.Activity.TeamsGetTeamInfo()?.AadGroupId` as the team-id.

**If `groupId` is used instead:**
- Membership API returns members of the wrong team.
- Cross-tenant shared channel members are missed entirely.
- Channel API calls may return 404 because the channel belongs to a different host team.

Note that `hostTeamGroupID` and `hostTenantID` are not applicable for all URLs or URL templates. They are applicable only for Graph API calls, as values read from `getContext()` to be passed in the URL. There are no query parameters or placeholders that app developers need to use with these names.

---

### MEM-6 · Inspect `@microsoft.graph.originalSourceMembershipUrl` to classify direct vs indirect members
**Severity: MEDIUM**

The `allMembers` API and indirect membership change notifications include the `@microsoft.graph.originalSourceMembershipUrl` annotation on each member object. Apps must read this annotation to correctly classify members:

- **Direct member:** The annotation URL points back to this channel's own membership endpoint.
- **Indirect member:** The annotation URL points to a different team (the source team that shares the channel).

```json
{
  "@microsoft.graph.originalSourceMembershipUrl": "https://graph.microsoft.com/v1.0/tenants/{tenant}/teams/{sourceTeamId}/channels/{channelId}/members/{memberId}",
  "id": "...",
  "roles": ["owner"],
  "displayName": "Jane Doe",
  "tenantId": "..."
}
```

**If not handled:**
- Apps that remove all "removed" users without checking direct/indirect paths may incorrectly revoke access.
- Deduplication of double-notifications for users who are both direct and indirect members requires this annotation.

---

## FS — File & SharePoint Rules

### FS-1 · Never assume one SharePoint site per team
**Severity: CRITICAL**

Standard channels share the team's SharePoint site. Shared and private channels each have their **own** dedicated SharePoint site and `driveId`.

**If assumed:**
- Files are written to the wrong site.
- File reads return 404 or 403.
- Content leaks across channel boundaries.

---

### FS-2 · Always resolve `driveId` and `itemId` per channel via `filesFolder`
**Severity: CRITICAL**

Use this API to get the correct drive root for any channel type:

```http
GET /teams/{teamId}/channels/{channelId}/filesFolder
```

Response properties to store and reuse:
- `parentReference.driveId` — the channel's SharePoint driveId
- `id` — the folderId for the channel's root

**Never** hardcode SharePoint library names or paths (e.g., `/Shared Documents/{ChannelName}`). Use this API for all channel types, including standard channels.

**SDK equivalents:**

| Language | Correct usage |
|----------|--------------|
| C# (Graph SDK) | `graphClient.Teams[teamId].Channels[channelId].FilesFolder.GetAsync()` |
| JavaScript | `client.api('/teams/{id}/channels/{id}/filesFolder').get()` |
| Python | `graph_client.teams.by_team_id(id).channels.by_channel_id(id).files_folder.get()` |
| Java | `graphClient.teams().byTeamId(id).channels().byChannelId(id).filesFolder().get()` |

> **Private channel note:** After the private channel SharePoint migration, `filesFolder` returns the root folder's `driveItem`, not a named subfolder. Newly created private channels no longer create a dedicated subfolder — all files go to the root. Do not rely on a named subfolder matching the channel name.

---

### FS-3 · Do not cache a single team-level `driveId` for all channels
**Severity: CRITICAL**

Each shared/private channel has a distinct `driveId`. A cached team-level driveId will cause all file operations in shared/private channels to target the wrong drive.

**Correct pattern:** Cache driveId **per channelId**, and refresh via `filesFolder` when a new channel is encountered.

See `FS-2` section for calling patterns.

---

### FS-4 · Use membership-based sharing links, not org-wide links
**Severity: HIGH**

Organization-wide or anonymous sharing links exclude external members even if they are channel members.

**Do not use:**
- Organization-wide links
- Anonymous links for shared channel content

**Use instead:**
- Specific-people sharing (`/invite` API)
- "People with existing access" links
- Membership-based permissions

```http
POST /drives/{driveId}/items/{itemId}/invite
```

---

### FS-5 · Declare `File.Read.Group` RSC permission for RSC apps accessing channel files
**Severity: HIGH** *(conditional — only applies if the app uses RSC auth for file APIs)*

For apps using Resource-Specific Consent (RSC) that access channel files via the Graph API, declare the `File.Read.Group` permission. This is the least-privileged RSC application permission for the `filesFolder` API.

**This permission is NOT required** if the app uses service-level auth (client credentials or OBO with delegated Graph permissions) instead of RSC.

```json
{
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {
          "name": "File.Read.Group",
          "type": "Application"
        }
      ]
    }
  }
}
```

**If missing (RSC apps only):** `GET /teams/{id}/channels/{id}/filesFolder` returns 403.

---

## BOT — Bot & Messaging Rules

### BOT-1 · Do not assume bot is present in a channel just because it's in the team
**Severity: CRITICAL**

Apps installed at the team level are **not** automatically available in shared or private channels. The app must be explicitly added to each channel.

**If assumed:**
- Proactive messages to the channel fail with 403.
- Bot silently drops messages; users see nothing.

**Correct approach:** Use the `channelMemberAdded` event to detect when the bot is added to a channel and trigger per-channel setup logic.

---

### BOT-2 · Listen to `channelMemberAdded` for per-channel bot setup
**Severity: HIGH**

When the bot receives a `channelMemberAdded` event inside `OnConversationUpdateActivityAsync`, use it to:
- Send a welcome/setup message
- Fetch the channel roster
- Configure tabs
- Start scheduled jobs

Do not rely solely on team-level install events (`teamMemberAdded` / uninstall) for per-channel logic.

---

### BOT-3 · Handle `channelshared` and `channelunshared` events
**Severity: HIGH**

When a shared channel is added to or removed from another team, your bot receives a `conversationUpdate` activity with `eventType` = `channelshared` or `channelunshared`.

Use these events to:
- Update which channels the bot is active in.
- Stop sending proactive messages to channels the bot is no longer associated with.
- Trigger a membership refresh via `allMembers`.

```csharp
var tcd = turnContext.Activity.GetChannelData<TeamsChannelData>();
var eventType = tcd?.EventType?.ToLowerInvariant();

switch (eventType)
{
    case "channelshared":
        // Refresh membership, update state
        break;
    case "channelunshared":
        // Remove channel from active list
        break;
}
```

**If not handled:** Bot keeps sending to channels it's no longer part of, generating repeated 403 errors and stale state.

---

### BOT-4 · Send welcome messages on `channelMemberAdded`, not only on team install
**Severity: MEDIUM**

If welcome/setup logic only fires on team install events, shared and private channels never receive it when the bot is first enabled there.

---

### BOT-5 · Use `GetChannelData<SharedChannelChannelData>()` for shared channel event payloads
**Severity: HIGH**

For `channelshared` and `channelunshared` events, the full payload (including the list of teams the channel was shared with or unshared from) is only available via `SharedChannelChannelData`, not the base `TeamsChannelData`.

```csharp
// ❌ Insufficient — misses SharedWithTeams / UnsharedFromTeams lists
var tcd = turnContext.Activity.GetChannelData<TeamsChannelData>();

// ✅ Correct — gives access to SharedWithTeams and UnsharedFromTeams
var extended = turnContext.Activity.GetChannelData<SharedChannelChannelData>();
var sharedWith = extended?.SharedWithTeams ?? new List<TeamInfoEx>();
var unsharedFrom = extended?.UnsharedFromTeams ?? new List<TeamInfoEx>();
```

Each `TeamInfoEx` in the list contains `Id`, `Name`, `AadGroupId`, and `TenantId` — use these to update per-team state and handle cross-tenant scenarios.

**If only `TeamsChannelData` is used:** The bot cannot determine which teams the channel was shared with or unshared from, making it impossible to update membership tracking or routing state accurately.

---

### BOT-6 · Use Teams SDK ≥ 2.0.0 (`Microsoft.Teams.SDK` / `@microsoft/teams-js` v2)
**Severity: CRITICAL**

NGC-aware APIs — `SharedChannelChannelData`, `AllMembers`, `hostTeamGroupID`, `channel.ownerTenantId`, and the `channelshared`/`channelunshared` event types — were introduced in version 2.0 of both the .NET and JavaScript Teams SDKs. Any version below 2.0 is missing these APIs entirely; calling them against an older SDK silently falls back to incomplete or incorrect behavior.

**For .NET projects — check `*.csproj` / `packages.config` / `Directory.Packages.props`:**
```xml
<!-- ❌ Too old — NGC APIs unavailable -->
<PackageReference Include="Microsoft.Teams.SDK" Version="1.*" />

<!-- ✅ Minimum required -->
<PackageReference Include="Microsoft.Teams.SDK" Version="2.0.0" />
```

**For JavaScript / TypeScript projects — check `package.json`:**
```json
// ❌ Too old
"@microsoft/teams-js": "^1.x.x"

// ✅ Minimum required
"@microsoft/teams-js": "^2.0.0"
```

**If below 2.0.0:**
- `SharedChannelChannelData` type is absent; `channelshared`/`channelunshared` events cannot be parsed.
- `hostTeamGroupID` and `channel.ownerTenantId` are not present in the context object.
- `AllMembers` navigation property does not exist on the Graph SDK fluent client.
- All BOT-3, BOT-5, CTX-1, CTX-2, and MEM-5 fixes depend on this upgrade being in place first.

---

## AUTH — Authentication & External User Rules

### AUTH-1 · Use `hostTenantId` / `ownerTenantId` for SharePoint token requests
**Severity: CRITICAL**

External (cross-tenant) users reside in their home tenant. When they access SharePoint content in the host channel's site, the `getAuthToken` call must use the **host tenant ID**, not the user's own tenant ID.

**For tabs (JS SDK v2):**
```js
const context = await microsoftTeams.app.getContext();
const hostTenantId = context.channel.ownerTenantId;
```

**For bots (Agent SDK / Bot Framework):**
```csharp
var hostTenantId = turnContext.Activity.Conversation.TenantId;
```

Pass `hostTenantId` in the `tenantId` parameter of `getAuthToken` so SPO grants the correct cross-tenant access.

**If skipped:** External users get token errors or access-denied when opening tab content backed by SharePoint.

---

### AUTH-2 · Do not block users based on unrecognized tenant IDs
**Severity: HIGH**

Shared channels support cross-tenant members. Their `tenantId` will not match the host's `ownerTenantId`. Treating unknown tenant IDs as "invalid" accidentally blocks legitimate external collaborators.

Do not assume all users are from the host tenant. Compare `user.tenant.id` (the current user's tenant) with `channel.ownerTenantId` (the host tenant) to detect external users. If they differ, the user is external — not invalid.

```js
const context = await microsoftTeams.app.getContext();
const isExternal = context.user.tenant.id !== context.channel.ownerTenantId;
```

---

### AUTH-3 · Detect guest users via `roles` property, not heuristics
**Severity: MEDIUM**

To reliably identify guests, check the `roles` field in the `allMembers` response:

```http
GET /teams/{team-id}/channels/{channel-id}/allMembers
```

For guests: `"roles": ["guest"]`

Do not rely on display name patterns, email domain heuristics, or upstream session flags.

---

## DATA — Data Scoping Rules

### DATA-1 · Never include private channel data in team-wide reports or dashboards
**Severity: CRITICAL**

Private channel content is restricted to channel members. Aggregating it into a team-wide view exposes sensitive data to users who do not have access.

**Rule:** Scope all data reads, reports, and analytics to the channel context in which the app is running.

---

### DATA-2 · Do not cross-post or broadcast across channels assuming shared team membership
**Severity: HIGH**

Broadcasting content from one channel to others, or generating links that span channels, assumes all team members see all channels — which is false for shared and private channels.

**Rule:** Cross-channel operations require explicit permission checks per channel.

---

### DATA-3 · Do not rely on `channelType` or `membershipType` for app behavior logic
**Severity: CRITICAL**

Channel type values are subject to change as the Teams platform evolves. App logic that branches on `membershipType` or `channelType` will become brittle.

**Correct approach:** Use capability-based APIs (`allMembers`, `filesFolder`, `doesUserHaveAccess`) to determine behavior, not channel-type discrimination.

> **Note:** Reading `membershipType` for **display-only** purposes (e.g., showing a label) is acceptable. The rule applies to branching app logic on these values.

---

## SUB — Graph Subscription Rules

### SUB-1 · Use correct resource path and include `notifyOnIndirectMembershipUpdate=true`
**Severity: HIGH**

The correct resource path for subscribing to ALL private and shared channel membership changes in a team is:

```http
/teams/{team-id}/channels/getAllMembers
```

To also receive **indirect** membership updates (from shared teams), add both query parameters:

```http
/teams/{team-id}/channels/getAllMembers?notifyOnIndirectMembershipUpdate=true&suppressNotificationWhenSharedUnsharedWithTeam=true
```

Full subscription request:
```json
{
  "changeType": "created,deleted,updated",
  "notificationUrl": "https://your-webhook/api/notifications",
  "resource": "/teams/{team-id}/channels/getAllMembers?notifyOnIndirectMembershipUpdate=true&suppressNotificationWhenSharedUnsharedWithTeam=true",
  "includeResourceData": true,
  "expirationDateTime": "2024-09-19T11:00:00.0000000Z"
}
```

**Without `notifyOnIndirectMembershipUpdate=true`:** Only direct membership changes fire. Indirect changes (from shared teams) are silently missed, causing roster drift.

**Without `suppressNotificationWhenSharedUnsharedWithTeam=true`:** Individual per-user notifications fire when a channel is shared/unshared with a large team, causing thousands of events. Always pair this with `SUB-2`.

---

### SUB-2 · Use `sharedWithTeams` subscription for bulk share/unshare events
**Severity: HIGH**

When a shared channel is added to or removed from a large team, per-user notifications can number in the thousands. Subscribe to `sharedWithTeams` for a single share/unshare event, then refresh the full member list via `allMembers`.

```json
{
  "changeType": "created,deleted",
  "notificationUrl": "https://your-webhook/api/notifications",
  "resource": "/teams/{team-id}/channels/{channel-id}/sharedWithTeams",
  "includeResourceData": true,
  "expirationDateTime": "2024-09-19T11:00:00.0000000Z"
}
```

After receiving this notification, call `allMembers` to get the current full roster.

---

### SUB-3 · Deduplicate member-added notifications
**Severity: MEDIUM**

A user who is both a direct and indirect member of a shared channel may trigger duplicate `memberAdded` notifications. Before processing, check whether the user already exists in your roster using `allMembers` and deduplicate using the `@microsoft.graph.originalSourceMembershipUrl` annotation to distinguish the source.

---

### SUB-4 · Include `lifecycleNotificationUrl` for subscriptions with expiry > 1 hour
**Severity: HIGH**

If the `expirationDateTime` in a subscription request is more than **one hour** in the future, you must include a `lifecycleNotificationUrl` property. Without it, subscription creation fails with an error.

```json
{
  "changeType": "created,deleted,updated",
  "notificationUrl": "https://your-webhook/api/notifications",
  "lifecycleNotificationUrl": "https://your-webhook/api/lifecycle",
  "resource": "/teams/{team-id}/channels/getAllMembers?notifyOnIndirectMembershipUpdate=true",
  "expirationDateTime": "2024-09-19T11:00:00.0000000Z"
}
```

**If missing:** Subscription creation requests with expiry > 1 hour will be rejected by the platform.

---

## CTX — Context API Rules

### CTX-1 · Use `hostTeamGroupID` and `hostTenantID` from `getContext()` for Graph calls
**Severity: HIGH**

For shared and private channels, `getContext()` returns two new properties:
- `hostTeamGroupID` — the group ID of the team that hosts the channel
- `hostTenantID` — the tenant ID of the host team

Use these (not the bare `groupId`) when calling Graph APIs for channel membership, file access, or tenant comparison.

> See also `MEM-5` for the specific membership API implication: `hostTeamGroupID` must be used as the `{team-id}` parameter in all `/teams/{team-id}/channels/{channel-id}/...` Graph API calls.

---

### CTX-2 · Use `channel.ownerTenantId` for cross-tenant SharePoint access
**Severity: HIGH**

When calling `getAuthToken` for SharePoint resources from a tab, use `context.channel.ownerTenantId` as the `tenantId` parameter. This ensures tokens are scoped to the host tenant where the SharePoint site lives.

---

# Scanning Instructions

## Step 1 — Short Circuit: Check if the app has channel scope

**Before doing any deep scan**, locate `manifest.json` (or files under `appPackage/`).

Check whether **any** element in the manifest has a `"scopes"` array that contains `"team"`. This includes `configurableTabs`, `staticTabs`, `bots`, `composeExtensions`, etc.

- **If NO element has `"team"` in its `scopes`:** The app has no channel installation surface (personal-only or groupChat-only). NGC rules do not apply. **Stop here** and report: ✅ **Channel Ready — NGC Not Applicable** with a note that the app has no team/channel scope and therefore does not need NGC compliance.

- **If ANY element has `"team"` in its `scopes`:** The app can be installed in channels. Continue to Step 2.

- **If `manifest.json` is not found:** Issue a warning that manifest is not available (may be hosted on CDN). Proceed with code scanning and note that manifest must be verified separately.

## Step 2 — Manifest Check (2 mandatory items + deferred RSC check)

Read `manifest.json` and check **only** the items below. Do not evaluate any other manifest section. Ignore all URLs in the manifest.

1. **`manifestVersion`** — must be `"1.25"` or higher. Flag as **CRITICAL** if lower or missing.
2. **`supportsChannelFeatures`** — must be present with value `"tier1"`. Flag as **CRITICAL** if missing or wrong value.

**RSC permissions (`ChannelMember.Read.Group`, `File.Read.Group`) are NOT checked here.** They are conditional on what the code actually does and are evaluated during the code scan in Step 3:
- `ChannelMember.Read.Group` is checked inside the **Membership APIs** scan section.
- `File.Read.Group` is checked inside the **File & SharePoint** scan section.

Do not flag RSC permissions as violations in this step.

Do not flag any other manifest fields as violations.

## Step 3 — Code Scan

Using the rules above as evaluation criteria, systematically search the codebase for evidence of compliance or violation. Use targeted searches across all relevant file types.

> **Construct applicability principle:** Every rule category below is conditional on the app actually using that construct. Before scanning a category, first confirm the construct is present. If it is absent, **skip the entire category** and note it as "not applicable" in the report — do not flag phantom violations for code that doesn't exist. The applicability check for each category is listed under its **"Skip if"** line.

---

### Membership APIs
**Skip if:** No Graph API calls to teams, channels, groups, or membership endpoints exist anywhere in the codebase (search for `graph`, `teams`, `channels`, `members`). If absent, skip all MEM rules.

**Flag as violations:**
- `GetGroupMembersAsync` / `/groups/{id}/members` used for channel access decisions
- `.Members.GetAsync()` — C# Graph SDK, returns direct only
- `.members().get()` — Java Graph SDK, returns direct only
- `.members.get()` — Python Graph SDK, returns direct only
- `client.api('/teams/.../channels/.../members').get()` — JavaScript, returns direct only
- `/teams/{id}/members` — team-level member list, not channel-scoped

**Look for correct usage:**
- `.AllMembers.GetAsync()` — C# Graph SDK ✅
- `.allMembers().get()` — Java Graph SDK ✅
- `.all_members.get()` — Python Graph SDK ✅
- `client.api('/teams/.../channels/.../allMembers').get()` — JavaScript ✅
- `/teams/{id}/channels/{id}/allMembers` in raw HTTP calls ✅

**Also search for:**
- `doesUserHaveAccess` — note if used or absent on member-removed events
- `@microsoft.graph.originalSourceMembershipUrl` — note if absent (Bucket 3 item)
- `groupId` used as `team-id` in Graph calls — flag if `hostTeamGroupID` is not used instead
- `hostTeamGroupID` — confirm it's read from context and passed to Graph APIs

**RSC manifest check (MAN-2 — only if membership APIs are in use):**
If the app calls `allMembers`, `members`, or any channel membership Graph API, check whether the app uses RSC (Resource-Specific Consent) or service-level auth (client credentials / OBO with delegated Graph permissions):
- If using **RSC**: flag as **HIGH** if `ChannelMember.Read.Group` is absent from `authorization.permissions.resourceSpecific` in the manifest.
- If using **service-level auth**: no manifest RSC entry is needed — do not flag.
- If auth method is unclear: note it as a Bucket 2 observation.

---

### File & SharePoint
**Skip if:** No SharePoint, OneDrive, or drive-related code exists (search for `drive`, `sharepoint`, `filesFolder`, `Shared Documents`, `driveId`). If absent, skip all FS rules.

**Flag as violations:**
- Hardcoded `/Shared Documents/` paths in SPO URLs
- `driveId` cached at team level without `channelId` as key
- Org-wide or anonymous link generation patterns

**Look for correct usage:**
- `filesFolder` in API calls — confirms FS-2 compliance ✅
- `.FilesFolder.GetAsync()` — C# SDK ✅
- `parentReference.driveId` stored per-channel ✅
- `/drives/{driveId}/items/{itemId}/invite` — membership-based sharing ✅

**RSC manifest check (MAN-2 / FS-5 — only if file APIs are in use):**
If the app calls `filesFolder` or accesses channel files via Graph API, check whether it uses RSC or service-level auth:
- If using **RSC**: flag as **HIGH** if `File.Read.Group` is absent from `authorization.permissions.resourceSpecific` in the manifest.
- If using **service-level auth**: no manifest RSC entry is needed — do not flag.
- If auth method is unclear: note it as a Bucket 2 observation.

---

### Bot & Agent SDK Events
**Skip if:** The manifest has no `bots` element. If no bot is registered, skip all BOT rules including BOT-6.

**SDK version check (BOT-6 — applies to all bot projects):**
- Search `*.csproj`, `Directory.Packages.props`, and `packages.config` for `Microsoft.Teams.SDK`. **Flag as CRITICAL** if the resolved version is below `2.0.0` (e.g., `1.*`, `0.*`, or any pre-release below 2.0).
- Search `package.json` for `@microsoft/teams-js`. **Flag as CRITICAL** if the version is below `2.0.0` (e.g., `^1.x.x`).
- If neither package is present as a direct dependency, note it and skip BOT-6.

**Flag as violations (only if bot does proactive messaging or has per-channel state):**
- `OnConversationUpdateActivityAsync` present but no handling for `channelshared`/`channelunshared` eventTypes
- `GetChannelData<TeamsChannelData>()` used alone for shared channel events without `SharedChannelChannelData`
- Bot setup logic only in `teamMemberAdded` with no `channelMemberAdded` equivalent
- Proactive message sending without verifying the bot is in the target channel

**Note: Messaging-extension-only bots** (link unfurling, search commands with no proactive messaging or per-channel state) are **not subject to BOT-1 through BOT-5** — these rules only apply to bots that send proactive messages or maintain per-channel install state. BOT-6 (SDK version) applies to all bot projects regardless.

---

### Authentication & External Users
**Skip if:** No authentication flows exist — no `getAuthToken`, `AcquireToken`, MSAL, OBO, or similar token-acquisition code found anywhere in the codebase. If absent, skip all AUTH rules.

**Flag as violations:**
- Code that rejects users based on unrecognized/non-matching tenant IDs (hardcoded tenant allowlists, blanket denial of `IsEnterpriseGuest` in shared channel contexts)
- `getAuthToken` called without passing `tenantId` when SharePoint is involved

**Note for Bucket 2 (suggestions, not violations):**
- Apps that restrict functionality for external/guest users based on session flags rather than Graph `roles` — the app may intentionally not support external users, but it's worth suggesting they evaluate this per channel type

---

### Data Scoping
**Skip if:** No multi-channel aggregation, reporting, broadcast, or cross-channel post patterns exist, AND no `membershipType`/`channelType`/`MembershipType`/`ChannelType` identifiers appear anywhere in the codebase. If absent, skip DATA rules.

- Search for analytics, reporting, dashboard, aggregate query code — check if it reads from multiple channels without access gating
- Search for broadcast or cross-post patterns
- **Flag as Bucket 1 violation (DATA-3 CRITICAL):** `membershipType` or `channelType` used in `if`/`switch`/`case` branching to select different code paths, different API calls, or different access decisions. Quote the switch/case block. The fix is to replace all branches with a single `allMembers` (or `filesFolder`) call that works for every channel type uniformly.
  - Exception: reading the value for display-only purposes (e.g., showing a label "Private channel") is acceptable and should NOT be flagged.

---

### Graph Subscriptions
**Skip if:** No Graph change notification or subscription code exists (search for `subscriptionUrl`, `notificationUrl`, `changeType`, `/subscriptions`). If absent, skip all SUB rules.

**Flag as violations:**
- Subscription resource pointing to `/channels/{id}/members` — wrong endpoint
- Missing `notifyOnIndirectMembershipUpdate=true` in membership subscription resource
- Missing `lifecycleNotificationUrl` when `expirationDateTime` is set to more than 1 hour out
- No `sharedWithTeams` subscription when the app handles bulk membership events

---

### Context API
**Skip if:** No `getContext`, `microsoftTeams.app.getContext`, or Teams JS SDK context calls exist in the frontend code. If absent, skip all CTX rules.

- `hostTeamGroupID` — confirm it's read from context and passed to Graph APIs
- `hostTenantID` — confirm it's read for tenant comparisons
- `channel.ownerTenantId` — confirm it's used for SPO token scoping

---

# Report Format

Produce the following structured report as an MD file in the root of the repo.

---

# NGC Channel Readiness Report
**App:** [name or root directory of the scanned codebase]
**Scanned:** [today's date]

---

## Overall Readiness

State one of the following verdicts, bold and prominent:

| Verdict | Criteria |
|---------|----------|
| ✅ **Channel Ready** | Zero confirmed violations. Manifest has `supportsChannelFeatures: tier1` and correct manifest version. |
| ✅ **Channel Ready — NGC Not Applicable** | App has no `"team"` scope in any manifest element. NGC rules do not apply. |
| ⚠️ **Needs Minor Changes** | No CRITICAL violations. A few HIGH rules need attention. Estimated effort of 2 to 3 days. |
| 🔴 **Needs Major Changes** | One or more CRITICAL violations. Core APIs or manifest need rework. Estimated effort 1+ weeks. |

Follow the verdict with 2–4 sentences explaining *why* the app is in this state, naming the dominant failure categories.

---

## Bucket 1 — Confirmed Violations

> These are blatant API misuse or missing declarations that will **certainly** break the app in shared or private channels. Each item must be fixed before the app is NGC-ready.

**Grouping rule — organize by code path, not by rule ID.**
Group all violations that touch the same file or the same logical code area into a single entry. List every applicable rule ID in the header. This makes it easy for a developer to open one file and see all the issues they need to fix in one place. Ordering: CRITICAL entries first, then HIGH.

**When multiple membership API calls are wrong in the same file** (e.g., `GetGroupMembersAsync`, `GetChannelMembersAsync`, and `GetChannelMemberAsync` all need to become `allMembers`), describe them all together in one entry rather than creating a separate entry for each call site.

For each entry:

```
### [N]. [File or Logical Code Area] — [Short Violation Title]
**Severity:** CRITICAL | HIGH  (use the highest severity among all violations in this group)
**Rules violated:** [e.g., MEM-1, MEM-2, DATA-3]
**Files:** `path/to/file:line`  (list multiple lines if violations span several locations in the same file)

**What's wrong:**
[Describe all violations in this code area together. Quote each specific call or pattern. Explain why each fails in shared/private channels. If multiple similar calls have the same root cause (e.g., all need allMembers), state the root cause once and enumerate the affected call sites.]

**Fix:**
[Consolidated fix addressing all violations in this entry. Correct API, code pattern, manifest field, or SDK method. Include a short snippet if it clarifies the fix.]

**Impact if unresolved:**
[One sentence on the concrete user-facing or security consequence in shared/private channels.]
```

If there are zero violations total, state: *No confirmed violations found.*

---

## Bucket 2 — Suggestions & Observations

> These are patterns that **may or may not** be issues depending on the app's intended behavior. The app could have valid reasons for these patterns — they are flagged here for review, not as required fixes.

Use a concise list format. For each item:

```
**[Rule ID] — [Short title]**
`path/to/file:line`
[One sentence describing the pattern and why it's worth reviewing. End with a specific suggestion for what to check or consider.]
```

Examples of what belongs here:
- App checks for guest or enterprise guest users and restricts functionality — valid if intentional, but worth reviewing per channel type (shared channels are designed for external collaboration)
- App reads `groupId` from context and passes to a backend — may be correct if the backend remaps it; verify the backend uses host team ID for channel-scoped Graph calls

---

## Bucket 3 — Futuristic / Migration Prep

> These are **not current violations** — the code does not use these APIs yet. They are changes that will be required when migrating to NGC-compliant patterns, or that would improve correctness and resilience once the Bucket 1 fixes are in place.

Use a concise list format. For each item:

```
**[Rule ID] — [Short title]**
[One sentence describing what needs to be added or changed, and when it becomes relevant (e.g., "Required when adopting allMembers API").]
```

Examples of what belongs here:
- Add `ChannelMember.Read.Group` RSC permission to manifest — required when moving from service-auth Graph calls to RSC-based channel membership APIs
- Extract `hostTeamGroupID` from `getContext()` and pipe to backend — required alongside any allMembers migration
- Inspect `@microsoft.graph.originalSourceMembershipUrl` on allMembers responses — needed after allMembers adoption to correctly classify direct vs indirect members and avoid double-counting

---

## Effort Estimate (Bucket 1 only)

| Area | Violations | Effort |
|------|-----------|--------|
| Manifest | | |
| Membership APIs | | |
| File / SharePoint | | |
| Bot Events | | |
| Auth | | |
| Data Scoping | | |
| Graph Subscriptions | | |
| Context API | | |
| **Total** | | **[range]** |

**Complexity driver:** [The single biggest source of effort in one sentence]

Generate the report as an MD file in the root folder.