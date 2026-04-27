#!/usr/bin/env node
'use strict';

/**
 * Generates type-safe reaction type definitions for all three SDK languages
 * from the live Teams emoji registry.
 *
 * Usage (from the teams-sdk directory):
 *   node scripts/generate-reactions.js
 *
 * Writes to sibling repos:
 *   ../teams.ts/packages/api/src/models/message/message-reaction.ts
 *   ../teams.py/packages/api/src/microsoft_teams/api/models/message/message_reaction_type.py
 *   ../teams.net/Libraries/Microsoft.Teams.Api/Messages/Reaction.cs
 */

const fs = require('fs');
const path = require('path');

const EMOJI_URL =
  'https://statics.teams.cdn.office.net/evergreen-assets/personal-expressions/v1/metadata/0f52465a47bf42f299c74a639443f33e/default.json';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const OUTPUTS = {
  ts: path.join(REPO_ROOT, 'teams.ts', 'packages', 'api', 'src', 'models', 'message', 'message-reaction.ts'),
  py: path.join(REPO_ROOT, 'teams.py', 'packages', 'api', 'src', 'microsoft_teams', 'api', 'models', 'message', 'message_reaction_type.py'),
  cs: path.join(REPO_ROOT, 'teams.net', 'Libraries', 'Microsoft.Teams.Api', 'Messages', 'Reaction.cs'),
};

// ── name converters ──────────────────────────────────────────────────────────

/** "Crying with laughter" → "CryingWithLaughter" */
function toPascalCase(description) {
  const pascal = description
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return /^\d/.test(pascal) ? '_' + pascal : pascal;
}

/** "Crying with laughter" → "CRYING_WITH_LAUGHTER" */
function toScreamingSnake(description) {
  const snake = description
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toUpperCase())
    .join('_');
  return /^\d/.test(snake) ? '_' + snake : snake;
}

/** Deduplicates generated names by appending a counter on collision. */
function dedup(emojis, keyFn) {
  const seen = new Map();
  return emojis.map((e) => {
    const base = keyFn(e.description);
    let name = base;
    let counter = 2;
    while (seen.has(name)) {
      name = base + counter++;
    }
    seen.set(name, true);
    return { ...e, name };
  });
}

// ── generators ───────────────────────────────────────────────────────────────

function generateTS(emojis) {
  const members = dedup(emojis, toPascalCase);

  const unionLines = members
    .map((e) => `  | '${e.id}' // ${e.description}`)
    .join('\n');

  return `\
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// To regenerate: node scripts/generate-reactions.js  (from the teams-sdk directory)
// Source: ${EMOJI_URL}

import { MessageUser } from './message-user';

/**
 * The type of emoji reaction that can be applied to a message.
 * Includes all ${emojis.length.toLocaleString()} Teams emoji IDs from the Teams emoji registry.
 * Use any of the string literals below for full IDE autocomplete, or pass any
 * custom string — the \`string & {}\` member keeps the type open without losing suggestions.
 *
 * @experimental This API is in preview and may change in the future.
 * Diagnostic: ExperimentalTeamsReactions
 */
// prettier-ignore
export type MessageReactionType =
${unionLines}
  | (string & {}); // allows any custom reaction ID while preserving autocomplete above

/**
 * Represents a reaction on a message, including the reaction type, timestamp, and user.
 *
 * @experimental This API is in preview and may change in the future.
 * Diagnostic: ExperimentalTeamsReactions
 */
export type MessageReaction = {
  /** The emoji reaction type applied to the message. */
  type: MessageReactionType;

  /** Timestamp of when the user reacted to the message. */
  createdDateTime?: string;

  /** The user who applied the reaction. */
  user?: MessageUser;
};
`;
}

function generatePY(emojis) {
  const members = dedup(emojis, toScreamingSnake);

  const enumLines = members
    .map((e) => `    ${e.name} = "${e.id}"  # ${e.description}`)
    .join('\n');

  return `\
"""
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.

THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
To regenerate: node scripts/generate-reactions.js  (from the teams-sdk directory)
Source: ${EMOJI_URL}
"""

from enum import StrEnum


# fmt: off
class MessageReactionType(StrEnum):
    """
    All ${emojis.length.toLocaleString()} Teams emoji IDs from the Teams emoji registry.

    Values are plain strings, so they serialize and deserialize transparently
    with Pydantic and the Teams API. Unknown IDs received from the API are
    accepted via _missing_ so deserialization never raises ValueError.

    Example::

        # IDE autocomplete for all known IDs:
        reaction = MessageReactionType.SMILE

        # Unknown IDs from the API still work:
        reaction = MessageReactionType("some_future_emoji_id")
    """

${enumLines}

    @classmethod
    def _missing_(cls, value: object) -> "MessageReactionType":
        """Accept unknown reaction IDs from the Teams API without raising ValueError."""
        obj = str.__new__(cls, str(value))
        obj._value_ = str(value)
        return obj
# fmt: on
`;
}

function generateCS(emojis) {
  const members = dedup(emojis, toPascalCase);

  const memberLines = members
    .map(
      (e) =>
        `    /// <summary>${e.description}</summary>\n` +
        `    public static readonly ReactionType ${e.name} = new("${e.id}");\n` +
        `    public bool Is${e.name} => ${e.name}.Equals(Value);\n`
    )
    .join('\n');

  return `\
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT MANUALLY.
// To regenerate: node scripts/generate-reactions.js  (from the teams-sdk directory)
// Source: ${EMOJI_URL}

using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using Microsoft.Teams.Common;

namespace Microsoft.Teams.Api.Messages;

/// <summary>
/// The type of reaction given to the message.
/// Includes all ${emojis.length.toLocaleString()} Teams emoji IDs from the Teams emoji registry.
/// </summary>
[Experimental("ExperimentalTeamsReactions")]
[JsonConverter(typeof(JsonConverter<ReactionType>))]
public class ReactionType(string value) : StringEnum(value)
{
${memberLines}
}

/// <summary>
/// Message Reaction
/// </summary>
[Experimental("ExperimentalTeamsReactions")]
public class Reaction
{
    /// <summary>
    /// The type of reaction given to the message.
    /// </summary>
    [JsonPropertyName("type")]
    [JsonPropertyOrder(0)]
    public required ReactionType Type { get; set; }

    /// <summary>
    /// Timestamp of when the user reacted to the message.
    /// </summary>
    [JsonPropertyName("createdDateTime")]
    [JsonPropertyOrder(1)]
    public string? CreatedDateTime { get; set; }

    /// <summary>
    /// The user with which the reaction is associated.
    /// </summary>
    [JsonPropertyName("user")]
    [JsonPropertyOrder(2)]
    public User? User { get; set; }
}
`;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching emoji metadata...');
  const res = await fetch(EMOJI_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();

  const raw = data.categories.flatMap((c) => c.emoticons);

  // Deduplicate by id — some emojis appear in multiple categories in the source JSON.
  const seen = new Set();
  const emojis = raw.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const dupes = raw.length - emojis.length;
  console.log(`  ${raw.length} raw entries → ${emojis.length} unique IDs (${dupes} duplicate${dupes !== 1 ? 's' : ''} removed) across ${data.categories.length} categories\n`);

  const files = [
    { label: 'TypeScript', path: OUTPUTS.ts, content: generateTS(emojis) },
    { label: 'Python',     path: OUTPUTS.py, content: generatePY(emojis) },
    { label: 'C#',         path: OUTPUTS.cs, content: generateCS(emojis) },
  ];

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.warn(`  [skip] ${file.label}: path not found\n         ${file.path}`);
      continue;
    }
    fs.writeFileSync(file.path, file.content, 'utf8');
    console.log(`  [ok]   ${file.label}: ${path.relative(REPO_ROOT, file.path)}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
