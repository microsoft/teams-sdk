import type { AccountInfo } from '@azure/msal-node';
import { confirm, input, select } from '@inquirer/prompts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { readGeneratedConfig, getGeneratedConfigPath, type AgentGeneratedConfig } from '../../../apps/agent-config.js';
import {
  addBlueprintSecret,
  assignLicense,
  createAgenticUser,
  createAgentIdentity,
  deleteServicePrincipal,
  deleteUser,
  getAgenticUserByIdOrUpn,
  getAssignedLicenseSkuIds,
  listSubscribedSkus,
  getAadAppByClientId,
  getBlueprintToken,
  getOrganizationInfo,
  getServicePrincipalByAppId,
  removeLicenses,
  updateServicePrincipal,
  updateUser,
  type SubscribedSku,
} from '../../../apps/graph.js';
import { getAzAccessToken } from '../../../utils/az.js';
import { readEnvValue } from '../../../utils/env.js';
import { CliError } from '../../../utils/errors.js';
import { logger } from '../../../utils/logger.js';
import { isAutoConfirm, isInteractive } from '../../../utils/interactive.js';
import { createSilentSpinner } from '../../../utils/spinner.js';
import { withAgentSpinner } from '../shared.js';

export interface ResolvedBlueprint {
  agentBlueprintId: string;
  agentBlueprintObjectId: string;
  agentBlueprintServicePrincipalObjectId: string;
  agentBlueprintName: string;
  clientSecret: string;
  /** True when a brand new client secret was minted via Graph because no local one was available. */
  secretMinted: boolean;
}

/**
 * Fast path: reuse the client secret already on disk from a prior `teams
 * agent blueprint create` run in this folder, if it's for the same
 * blueprint. Returns undefined on any mismatch/missing file so the caller
 * falls back to minting a fresh secret.
 */
function tryReadLocalBlueprintSecret(
  cwd: string,
  blueprintId: string
): Pick<
  ResolvedBlueprint,
  'agentBlueprintObjectId' | 'agentBlueprintServicePrincipalObjectId' | 'agentBlueprintName' | 'clientSecret'
> | undefined {
  if (!existsSync(getGeneratedConfigPath(cwd))) return undefined;

  let config: AgentGeneratedConfig;
  try {
    config = readGeneratedConfig(cwd);
  } catch {
    return undefined;
  }
  // config.json and .env can drift independently, so check both against blueprintId.
  if (config.agentBlueprintId !== blueprintId) return undefined;

  const envPath = join(cwd, '.env');
  const envClientId = readEnvValue(envPath, 'CLIENT_ID');
  if (envClientId !== blueprintId) return undefined;

  const clientSecret = readEnvValue(envPath, 'CLIENT_SECRET');
  if (!clientSecret) return undefined;

  return {
    agentBlueprintObjectId: config.agentBlueprintObjectId,
    agentBlueprintServicePrincipalObjectId: config.agentBlueprintServicePrincipalObjectId,
    agentBlueprintName: config.agentBlueprintName,
    clientSecret,
  };
}

/**
 * Resolves the client secret for an already-existing blueprint. Graph only
 * returns a secret's value at creation time, so if there's no local secret
 * for this blueprint, mints a brand new one instead of asking the user to
 * supply one. The caller persists it to `.env` for the next run's fast path.
 */
export async function resolveExistingBlueprint(
  blueprintId: string,
  cwd: string,
  account: AccountInfo,
  silent: boolean
): Promise<ResolvedBlueprint> {
  const local = tryReadLocalBlueprintSecret(cwd, blueprintId);
  if (local) {
    return { agentBlueprintId: blueprintId, secretMinted: false, ...local };
  }

  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const app = await withAgentSpinner(
      {
        start: 'Looking up agent blueprint...',
        success: 'Agent blueprint found.',
        error: 'Could not find an agent blueprint with that ID.',
      },
      silent,
      () => getAadAppByClientId(adminToken, blueprintId)
    );

    const principal = await withAgentSpinner(
      {
        start: 'Looking up blueprint service principal...',
        success: 'Blueprint service principal found.',
        error: 'Could not find the blueprint service principal.',
      },
      silent,
      () => getServicePrincipalByAppId(adminToken, blueprintId)
    );

    const secret = await withAgentSpinner(
      {
        start: 'No local secret found -- minting a new client secret for the blueprint...',
        success: 'Client secret minted.',
        error: 'Failed to mint a client secret.',
      },
      silent,
      () => addBlueprintSecret(adminToken, app.id)
    );

    return {
      agentBlueprintId: blueprintId,
      agentBlueprintObjectId: app.id,
      agentBlueprintServicePrincipalObjectId: principal.id,
      agentBlueprintName: app.displayName,
      clientSecret: secret.secretText,
      secretMinted: true,
    };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_BLUEPRINT_NOT_FOUND',
      error instanceof Error ? error.message : String(error),
      'Verify the blueprint ID is correct and your account can read/manage it.'
    );
  }
}

export interface AgentIdentityResult {
  agentIdentityId: string;
}

/**
 * Creates the agent identity service principal for an already-provisioned
 * blueprint: gets a client-credentials token for the blueprint, then uses
 * it to POST the agent identity, sponsored by the signed-in `teams login`
 * account. No standalone `teams agent identity` command -- this is always
 * a step inside `teams agent user create`.
 *
 * `identityName` is the agentic user's own name, not the blueprint's --
 * a blueprint can be reused across many agentic users.
 */
export async function runCreateAgentIdentity(
  identityName: string,
  agentBlueprintId: string,
  clientSecret: string,
  account: AccountInfo,
  silent: boolean
): Promise<AgentIdentityResult> {
  try {
    const blueprintToken = await withAgentSpinner(
      {
        start: 'Authenticating as the agent blueprint...',
        success: 'Authenticated as the agent blueprint.',
        error: 'Failed to authenticate as the agent blueprint.',
      },
      silent,
      () => getBlueprintToken(account.tenantId, agentBlueprintId, clientSecret)
    );

    const identity = await withAgentSpinner(
      {
        start: 'Creating agent identity...',
        success: 'Agent identity created.',
        error: 'Failed to create agent identity.',
      },
      silent,
      () =>
        createAgentIdentity(blueprintToken, {
          displayName: identityName,
          agentIdentityBlueprintId: agentBlueprintId,
          // MSAL's localAccountId is the Entra object ID the sponsors@odata.bind expects.
          sponsorObjectId: account.localAccountId,
        })
    );

    // Inherits the Messaging Bot API scope already granted on the blueprint; no per-identity grant needed.

    return { agentIdentityId: identity.id };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_IDENTITY_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify the blueprint was granted the AgentIdentity.CreateAsManager role, then retry.'
    );
  }
}

/**
 * Turn an agent name into a Graph-safe `mailNickname`/UPN local part (e.g.
 * "My Cool Agent!" -> "my-cool-agent"). Falls back to "agent" if nothing
 * alphanumeric survives.
 */
export function slugifyAgentName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'agent';
}

export interface AgenticUserResult {
  agenticUserId: string;
  userPrincipalName: string;
  /** True when a license was assigned (via `--license` or the interactive picker). */
  licenseAssigned?: boolean;
  /** `skuPartNumber` of the license assigned, when `licenseAssigned` is true. */
  licenseSkuPartNumber?: string;
  /** True when no license was assigned and it still needs to be done manually. */
  needsLicense?: boolean;
}

const USAGE_LOCATION_PATTERN = /^[A-Za-z]{2}$/;

function validateUsageLocationFormat(code: string): string {
  const trimmed = code.trim();
  if (!USAGE_LOCATION_PATTERN.test(trimmed)) {
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      `Invalid usage location "${code}" -- expected a two-letter country code (e.g. \`US\`).`
    );
  }
  return trimmed.toUpperCase();
}

/**
 * Resolves the usage location (two-letter country code) required to
 * create the agentic user.
 *
 * - `--usage-location` always wins (validated, format-checked).
 * - Otherwise, a tenant default (`countryLetterCode`) is used as-is when
 *   silent/non-interactive/`--yes`, confirmed first otherwise (declining
 *   lets the caller type a different code).
 * - With no default and no flag, prompts (or throws when non-interactive).
 */
async function resolveUsageLocation(
  countryLetterCode: string | undefined,
  usageLocationFlag: string | undefined,
  silent: boolean
): Promise<string> {
  if (usageLocationFlag?.trim()) return validateUsageLocationFormat(usageLocationFlag);

  if (countryLetterCode) {
    if (silent || !isInteractive() || isAutoConfirm()) return countryLetterCode;
    const useDetected = await confirm({
      message: `Use detected usage location ${pc.cyan(countryLetterCode)} for the agentic user?`,
      default: true,
    });
    if (useDetected) return countryLetterCode;
  } else if (silent || !isInteractive() || isAutoConfirm()) {
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      "Could not determine the tenant's default usage location automatically.",
      'Pass a two-letter country code (e.g. `US`) to continue, or set it manually once the user is created.'
    );
  }

  const code = await input({
    message: 'Usage location for the agentic user (two-letter country code, e.g. US):',
    validate: (value) =>
      USAGE_LOCATION_PATTERN.test(value.trim())
        ? true
        : value.trim()
          ? `Invalid usage location "${value}" -- expected a two-letter country code (e.g. \`US\`).`
          : 'Usage location cannot be empty.',
  });
  return validateUsageLocationFormat(code);
}


/**
 * Creates the Entra agentic user tied to an already-created agent identity.
 * Requires a human/admin-delegated token (the blueprint's own
 * client-credentials token 403s on this call), acquired via `az account
 * get-access-token`.
 */
export async function runCreateAgenticUser(
  agentName: string,
  agentIdentityId: string,
  account: AccountInfo,
  silent: boolean,
  /** [OPTIONAL] A specific license SKU ID/part number to assign; `false` to explicitly skip assignment. */
  licenseOption?: string | false,
  /** [OPTIONAL] Two-letter country code to use as the usage location, skipping detection/confirmation. */
  usageLocationOption?: string,
  /**
   * [OPTIONAL] Invoked right after the Graph user is created, before license
   * assignment is attempted, so the caller persists these IDs even if an
   * invalid `--license` throws afterward.
   */
  onUserCreated?: (created: { agenticUserId: string; userPrincipalName: string }) => void
): Promise<AgenticUserResult> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const org = await withAgentSpinner(
      {
        start: 'Looking up tenant domain...',
        success: 'Tenant domain found.',
        error: 'Failed to look up the tenant domain.',
      },
      silent,
      () => getOrganizationInfo(adminToken)
    );

    if (!org.defaultDomain) {
      throw new CliError(
        'AGENT_IDENTITY_USER_FAILED',
        "Could not determine the tenant's default domain to build the agentic user's UPN."
      );
    }

    const usageLocation = await resolveUsageLocation(org.countryLetterCode, usageLocationOption, silent);
    let slug = slugifyAgentName(agentName);
    let userPrincipalName = `${slug}@${org.defaultDomain}`;

    if (!silent && isInteractive() && !isAutoConfirm()) {
      while (true) {
        const proceed = await confirm({
          message: `Create agentic user ${pc.cyan(userPrincipalName)}?`,
          default: true,
        });
        if (proceed) break;

        const customLocalPart = await input({
          message: 'User principal name local part (before the @):',
          validate: (value) => (value.trim() ? true : 'User principal name local part cannot be empty.'),
        });
        slug = slugifyAgentName(customLocalPart);
        userPrincipalName = `${slug}@${org.defaultDomain}`;
      }
    }

    const user = await withAgentSpinner(
      {
        start: 'Creating agentic user...',
        success: 'Agentic user created.',
        error: 'Failed to create agentic user.',
      },
      silent,
      () =>
        createAgenticUser(adminToken, {
          displayName: agentName,
          mailNickname: slug,
          userPrincipalName,
          identityParentId: agentIdentityId,
          usageLocation,
        })
    );

    // Persist now -- a throw below during license assignment still leaves the user created in Graph.
    onUserCreated?.({ agenticUserId: user.id, userPrincipalName });

    const license = await resolveLicenseAssignment(adminToken, user.id, licenseOption, silent);

    return { agenticUserId: user.id, userPrincipalName, ...license };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      error instanceof Error ? error.message : String(error),
      'This call requires Global Administrator (or equivalent) permissions in Azure CLI -- run `az login` as an admin and retry.'
    );
  }
}

/**
 * Assigns a specific license SKU (by `skuId` or `skuPartNumber`) for
 * `--license <skuId>`. Unlike the interactive picker, throws on failure
 * since the caller explicitly asked for this SKU.
 */
async function assignSpecificLicense(
  adminToken: string,
  userId: string,
  skuIdOrPartNumber: string,
  silent: boolean
): Promise<Pick<AgenticUserResult, 'licenseAssigned' | 'licenseSkuPartNumber'>> {
  const spinner = createSilentSpinner('Looking up available licenses...', silent).start();
  let skus: SubscribedSku[];
  try {
    skus = await listSubscribedSkus(adminToken);
  } catch (error) {
    spinner.error({ text: "Failed to look up the tenant's licenses." });
    throw new CliError(
      'AGENT_LICENSE_NOT_FOUND',
      error instanceof Error ? error.message : String(error),
      'Verify your account can read the tenant\u2019s subscribed SKUs, then retry.'
    );
  }

  const needle = skuIdOrPartNumber.trim().toLowerCase();
  const sku = skus.find((s) => s.skuId.toLowerCase() === needle || s.skuPartNumber.toLowerCase() === needle);
  if (!sku) {
    spinner.error({ text: `No license SKU matching "${skuIdOrPartNumber}" was found.` });
    throw new CliError(
      'AGENT_LICENSE_NOT_FOUND',
      `No license SKU matching "${skuIdOrPartNumber}" was found in this tenant.`,
      'Run without `--license` to see the available SKU IDs/part numbers interactively.'
    );
  }
  if (sku.consumedUnits >= sku.enabledUnits) {
    spinner.error({ text: `${sku.skuPartNumber} has no available seats.` });
    throw new CliError(
      'AGENT_LICENSE_NOT_FOUND',
      `License ${sku.skuPartNumber} has no available seats (${sku.consumedUnits} of ${sku.enabledUnits} used).`,
      'Free up a seat or pick a different SKU.'
    );
  }
  spinner.success({ text: `${sku.skuPartNumber} found with an available seat.` });

  const assignSpinner = createSilentSpinner(`Assigning ${sku.skuPartNumber}...`, silent).start();
  try {
    await assignLicense(adminToken, userId, sku.skuId);
  } catch (error) {
    assignSpinner.error({ text: 'Failed to assign the license.' });
    throw new CliError(
      'AGENT_LICENSE_ASSIGN_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify your account has license assignment permissions, then retry.'
    );
  }
  assignSpinner.success({ text: `${sku.skuPartNumber} assigned.` });
  return { licenseAssigned: true, licenseSkuPartNumber: sku.skuPartNumber };
}

/**
 * Best-effort license assignment for a freshly created agentic user: looks
 * up the tenant's subscribed SKUs with available seats and lets the user
 * pick one interactively. Never throws -- surfaces `needsLicense` instead
 * so the caller can tell the user to do it manually.
 */
async function tryAssignLicenseInteractively(
  adminToken: string,
  userId: string,
  silent: boolean
): Promise<Pick<AgenticUserResult, 'licenseAssigned' | 'licenseSkuPartNumber' | 'needsLicense'>> {
  if (silent || !isInteractive() || isAutoConfirm()) {
    return { needsLicense: true };
  }

  const spinner = createSilentSpinner('Looking up available licenses...', silent).start();
  let skus: SubscribedSku[];
  try {
    skus = await listSubscribedSkus(adminToken);
  } catch (error) {
    spinner.error({ text: "Failed to look up the tenant's licenses." });
    logger.debug(error instanceof Error ? error.message : String(error));
    return { needsLicense: true };
  }

  // Eligible SKUs: user-assignable, enabled, with a free seat, and granting Teams.
  const available = skus.filter(
    (sku) =>
      sku.appliesTo === 'User' &&
      sku.capabilityStatus === 'Enabled' &&
      sku.consumedUnits < sku.enabledUnits &&
      sku.servicePlans.some((sp) => sp.servicePlanName.startsWith('TEAMS') && sp.provisioningStatus === 'Success')
  );
  if (available.length === 0) {
    spinner.error({ text: 'No eligible Microsoft 365 licenses (with Teams) and available seats found in this tenant.' });
    return { needsLicense: true };
  }
  spinner.success({ text: `Found ${available.length} eligible license(s) with available seats.` });

  const SKIP = '__skip__' as const;
  const choice = await select({
    message: 'Assign a license to the agentic user (required for it to be usable)?',
    choices: [
      ...available.map((sku) => ({
        name: `${sku.skuPartNumber} (${sku.enabledUnits - sku.consumedUnits} of ${sku.enabledUnits} seats available)`,
        value: sku.skuId,
      })),
      { name: "Skip -- I'll assign a license manually", value: SKIP },
    ],
  });
  if (choice === SKIP) return { needsLicense: true };

  const sku = available.find((s) => s.skuId === choice);
  const assignSpinner = createSilentSpinner(`Assigning ${sku?.skuPartNumber ?? 'license'}...`, silent).start();
  try {
    await assignLicense(adminToken, userId, choice);
    assignSpinner.success({ text: `${sku?.skuPartNumber ?? 'License'} assigned.` });
    return { licenseAssigned: true, ...(sku ? { licenseSkuPartNumber: sku.skuPartNumber } : {}) };
  } catch (error) {
    assignSpinner.error({ text: 'Failed to assign the license.' });
    logger.debug(error instanceof Error ? error.message : String(error));
    return { needsLicense: true };
  }
}

/**
 * Dispatches to the right license-assignment strategy: `--no-license`
 * skips entirely, `--license <skuId>` assigns that exact SKU and throws on
 * failure, otherwise falls back to the best-effort interactive picker.
 */
async function resolveLicenseAssignment(
  adminToken: string,
  userId: string,
  licenseOption: string | false | undefined,
  silent: boolean
): Promise<Pick<AgenticUserResult, 'licenseAssigned' | 'licenseSkuPartNumber' | 'needsLicense'>> {
  if (licenseOption === false) return { needsLicense: true };
  if (licenseOption) return assignSpecificLicense(adminToken, userId, licenseOption, silent);
  return tryAssignLicenseInteractively(adminToken, userId, silent);
}

export interface AgentUserUpdateResult {
  agenticUserId: string;
  name?: string;
  usageLocation?: string;
  userPrincipalName?: string;
  licenseAssigned?: boolean;
  licenseSkuPartNumber?: string;
  licenseRemoved?: boolean;
}

/**
 * Updates an existing agentic user's display name, usage location, and/or
 * license. Unlike `runCreateAgenticUser`, `--license`/`--no-license` here
 * always throw on failure since the caller asked for a specific change.
 */
export async function runUpdateAgenticUser(
  userIdOrUpn: string,
  account: AccountInfo,
  silent: boolean,
  name?: string,
  usageLocation?: string,
  licenseOption?: string | false,
  upn?: string
): Promise<AgentUserUpdateResult> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const agenticUser = await withAgentSpinner(
      {
        start: 'Looking up agentic user...',
        success: 'Agentic user found.',
        error: 'Could not find an agentic user with that ID/UPN.',
      },
      silent,
      async () => {
        const user = await getAgenticUserByIdOrUpn(adminToken, userIdOrUpn);
        if (!user) {
          throw new CliError(
            'AGENT_IDENTITY_USER_NOT_FOUND',
            `No agentic user found matching "${userIdOrUpn}".`,
            'Verify the object ID or UPN is correct.'
          );
        }
        return user;
      }
    );

    const result: AgentUserUpdateResult = { agenticUserId: agenticUser.id };

    const updates: Record<string, unknown> = {};
    if (name?.trim()) {
      updates.displayName = name.trim();
      result.name = name.trim();
    }
    if (usageLocation?.trim()) {
      const validated = validateUsageLocationFormat(usageLocation);
      updates.usageLocation = validated;
      result.usageLocation = validated;
    }
    if (upn?.trim()) {
      updates.userPrincipalName = upn.trim();
      result.userPrincipalName = upn.trim();
    }
    if (Object.keys(updates).length > 0) {
      await withAgentSpinner(
        {
          start: 'Updating agentic user...',
          success: 'Agentic user updated.',
          error: 'Failed to update agentic user.',
        },
        silent,
        () => updateUser(adminToken, agenticUser.id, updates)
      );
    }

    // Keep the agent identity's own displayName in sync, since it's a separate service principal.
    if (name?.trim()) {
      await withAgentSpinner(
        {
          start: 'Updating agent identity...',
          success: 'Agent identity updated.',
          error: 'Failed to update the agent identity.',
        },
        silent,
        () => updateServicePrincipal(adminToken, agenticUser.identityParentId, { displayName: name.trim() })
      );
    }

    if (licenseOption === false) {
      const assigned = await getAssignedLicenseSkuIds(adminToken, agenticUser.id);
      if (assigned.length > 0) {
        await withAgentSpinner(
          {
            start: 'Removing assigned license(s)...',
            success: 'License(s) removed.',
            error: 'Failed to remove the assigned license(s).',
          },
          silent,
          () => removeLicenses(adminToken, agenticUser.id, assigned)
        );
        result.licenseRemoved = true;
      }
    } else if (licenseOption) {
      const license = await assignSpecificLicense(adminToken, agenticUser.id, licenseOption, silent);
      Object.assign(result, license);
    }

    return result;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_IDENTITY_USER_FAILED',
      error instanceof Error ? error.message : String(error),
      'This call requires Global Administrator (or equivalent) permissions in Azure CLI -- run `az login` as an admin and retry.'
    );
  }
}

export interface AgentIdentityUserDeleteResult {
  agentIdentityId: string;
  agenticUserId: string;
}

/**
 * Deletes an agentic user and its parent agent identity directly by the
 * user's object ID or UPN, leaving the blueprint intact. Use `teams agent
 * blueprint delete` to remove the whole blueprint instead.
 */
export async function runDeleteAgentIdentityAndUser(
  userIdOrUpn: string,
  account: AccountInfo,
  silent: boolean,
  /**
   * [OPTIONAL] Already-known identity/user IDs from the local config.
   * Makes a partial prior deletion resumable: if a fresh lookup by
   * `userIdOrUpn` now 404s, falls back to deleting by these recorded IDs.
   */
  known?: { agentIdentityId: string; agenticUserId: string }
): Promise<AgentIdentityUserDeleteResult> {
  try {
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    const user = await withAgentSpinner(
      {
        start: 'Looking up agentic user...',
        success: 'Agentic user found.',
        error: 'Could not find an agentic user with that ID/UPN.',
      },
      silent,
      () => getAgenticUserByIdOrUpn(adminToken, userIdOrUpn)
    );

    if (!user && !known) {
      throw new CliError(
        'AGENT_IDENTITY_USER_NOT_FOUND',
        'No agentic user was found with that ID/UPN.',
        'Verify the agentic user ID or UPN is correct.'
      );
    }

    if (user) {
      await withAgentSpinner(
        {
          start: 'Deleting agentic user...',
          success: 'Agentic user deleted.',
          error: 'Failed to delete agentic user.',
        },
        silent,
        () => deleteUser(adminToken, user.id)
      );
    }

    const agentIdentityId = user?.identityParentId ?? known!.agentIdentityId;

    await withAgentSpinner(
      {
        start: 'Deleting agent identity...',
        success: 'Agent identity deleted.',
        error: 'Failed to delete agent identity.',
      },
      silent,
      () => deleteServicePrincipal(adminToken, agentIdentityId)
    );

    return { agentIdentityId, agenticUserId: user?.id ?? known!.agenticUserId };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_IDENTITY_USER_DELETE_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify your account has permission to delete this service principal/user, then retry.'
    );
  }
}
