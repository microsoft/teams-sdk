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
  listSubscribedSkus,
  getAadAppByClientId,
  getBlueprintToken,
  getOrganizationInfo,
  getServicePrincipalByAppId,
  grantSmbaAgentDataPermission,
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
  agentName: string;
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
  'agentBlueprintObjectId' | 'agentBlueprintServicePrincipalObjectId' | 'agentName' | 'clientSecret'
> | undefined {
  if (!existsSync(getGeneratedConfigPath(cwd))) return undefined;

  let config: AgentGeneratedConfig;
  try {
    config = readGeneratedConfig(cwd);
  } catch {
    return undefined;
  }
  if (config.agentBlueprintId !== blueprintId) return undefined;

  const clientSecret = readEnvValue(join(cwd, '.env'), 'CLIENT_SECRET');
  if (!clientSecret) return undefined;

  return {
    agentBlueprintObjectId: config.agentBlueprintObjectId,
    agentBlueprintServicePrincipalObjectId: config.agentBlueprintServicePrincipalObjectId,
    agentName: config.agentName,
    clientSecret,
  };
}

/**
 * Resolve the client secret needed to authenticate as an already-existing
 * blueprint (identified by its `appId`/client ID), for `teams agent user
 * create <blueprintId>`. Tries the local fast path first; Graph only
 * returns a client secret's value once at creation time, so if there's no
 * local secret for this blueprint, this mints a brand new one via Graph
 * instead of asking the user to supply one. The caller persists this
 * secret to the local `.env` so the next run in the same folder uses the
 * fast path.
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
      agentName: app.displayName,
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
 * Create the agent identity service principal for an already-provisioned
 * blueprint. Mirrors the manual flow: get a client-credentials token for
 * the blueprint itself (carries `AgentIdentity.CreateAsManager`), then use
 * it to POST the agent identity, sponsored by the signed-in `teams login`
 * account. An agent identity has no bot ID/credentials of its own -- it's
 * purely an Entra/directory governance layer on top of the blueprint's
 * existing identity -- so there's no standalone `teams agent identity`
 * command; this is always a step inside `teams agent user create`.
 */
export async function runCreateAgentIdentity(
  agentName: string,
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
          displayName: agentName,
          agentIdentityBlueprintId: agentBlueprintId,
          // The signed-in account sponsors the identity. MSAL's
          // `localAccountId` is the Entra object ID (the token's `oid`
          // claim) -- exactly what `sponsors@odata.bind` expects -- so no
          // separate Graph lookup is needed to resolve it.
          sponsorObjectId: account.localAccountId,
        })
    );

    // Each agent identity is its own service principal, distinct from the
    // blueprint's -- granting the Messaging Bot API permission on the
    // blueprint alone isn't enough. Without this grant on the identity
    // itself, the agentic user's on-behalf-of token exchange (used to
    // post/reply as it) fails with `AADSTS65001: ... has not consented to
    // use the application ...` / `consent_required`. This write needs
    // `DelegatedPermissionGrant.ReadWrite.All`, which the blueprint's own
    // client-credentials token doesn't carry, so this uses a fresh
    // admin-delegated token instead.
    const adminToken = await withAgentSpinner(
      {
        start: 'Acquiring an admin token via Azure CLI...',
        success: 'Admin token acquired.',
        error: 'Could not get an admin token from the Azure CLI.',
      },
      silent,
      () => getAzAccessToken('https://graph.microsoft.com', account.tenantId)
    );

    await withAgentSpinner(
      {
        start: 'Granting Messaging Bot API AgentData.ReadWrite permission...',
        success: 'Messaging Bot API permission granted.',
        error: 'Failed to grant the Messaging Bot API permission.',
      },
      silent,
      () => grantSmbaAgentDataPermission(adminToken, identity.id)
    );

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
 * - Otherwise, if the tenant has a default (`countryLetterCode` from
 *   `getOrganizationInfo`), it's used as-is in silent/non-interactive/
 *   `--yes` runs; in an interactive session it's confirmed first, since
 *   a tenant's billing country isn't necessarily where this particular
 *   agentic user should be licensed -- declining lets the caller type a
 *   different code instead.
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

  const code = await input({ message: 'Usage location for the agentic user (two-letter country code, e.g. US):' });
  if (!code.trim()) {
    throw new CliError('AGENT_IDENTITY_USER_FAILED', 'Usage location cannot be empty.');
  }
  return validateUsageLocationFormat(code);
}


/**
 * Create the Entra agentic user tied to an already-created agent identity.
 * Requires a human/admin-delegated token -- the blueprint's own
 * client-credentials token 403s on this call -- so this shells out to
 * `az account get-access-token` the same way `ensureTenantMatch` already
 * does, instead of adding a second MSAL auth flow.
 */
export async function runCreateAgenticUser(
  agentName: string,
  agentIdentityId: string,
  account: AccountInfo,
  silent: boolean,
  /**
   * [OPTIONAL] A specific license SKU ID/part number to assign, skipping
   * the interactive picker; `false` to explicitly skip assignment
   * (Commander maps `--license <skuId>`/`--no-license` onto this one value).
   */
  licenseOption?: string | false,
  /** [OPTIONAL] Two-letter country code to use as the usage location, skipping detection/confirmation. */
  usageLocationOption?: string
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
    const slug = slugifyAgentName(agentName);
    const userPrincipalName = `${slug}@${org.defaultDomain}`;

    if (!silent && isInteractive() && !isAutoConfirm()) {
      const proceed = await confirm({
        message: `Create agentic user ${pc.cyan(userPrincipalName)}?`,
        default: true,
      });
      if (!proceed) {
        throw new CliError('AGENT_IDENTITY_USER_FAILED', 'Agentic user creation cancelled.');
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
 * Assigns a specific license SKU (by `skuId` or `skuPartNumber`, matched
 * case-insensitively) to a freshly created agentic user, for `--license
 * <skuId>` non-interactive callers. Unlike the interactive picker, this
 * throws on failure -- the caller explicitly asked for this SKU, so
 * silently falling back to `needsLicense` would hide a real problem (typo,
 * no seats left, etc.) from a script relying on the exit code/JSON output.
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
 * Best-effort license assignment for a freshly created agentic user.
 * There's no single SKU name that works across tenants -- the license an
 * agentic user needs (e.g. an M365 plan with Teams/Exchange) depends on
 * what the tenant has purchased -- so this looks up the tenant's
 * subscribed SKUs with available seats and lets the user pick one
 * interactively. Never throws -- a lookup/assignment failure, or no
 * interactive session to prompt in, shouldn't fail the whole `teams agent
 * user create` run since the user is already created at this point; it's
 * surfaced as `needsLicense` so the caller can tell the user to do it
 * manually instead.
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

  const available = skus.filter((sku) => sku.consumedUnits < sku.enabledUnits);
  if (available.length === 0) {
    spinner.error({ text: 'No licenses with available seats found in this tenant.' });
    return { needsLicense: true };
  }
  spinner.success({ text: `Found ${available.length} license(s) with available seats.` });

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
 * Dispatches to the right license-assignment strategy for `teams agent
 * user create`: `--no-license` (`licenseOption === false`) skips entirely
 * (no Graph lookup at all), `--license <skuId>` assigns that exact SKU
 * and throws on any failure, and otherwise falls back to the best-effort
 * interactive picker.
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

export interface AgentIdentityUserDeleteResult {
  agentIdentityId: string;
  agenticUserId: string;
}

/**
 * Delete an agentic user and its parent agent identity directly by the
 * user's object ID or UPN, leaving the blueprint itself intact. A
 * blueprint can be reused across multiple agentic users (`teams agent
 * user create <blueprintId>`), so deleting the whole blueprint isn't
 * appropriate just to remove one identity/user -- use `teams agent
 * blueprint delete` for that instead. Looking the user up directly (by ID
 * or UPN) avoids needing to know which blueprint created it first.
 */
export async function runDeleteAgentIdentityAndUser(
  userIdOrUpn: string,
  account: AccountInfo,
  silent: boolean
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

    if (!user) {
      throw new CliError(
        'AGENT_IDENTITY_USER_NOT_FOUND',
        'No agentic user was found with that ID/UPN.',
        'Verify the agentic user ID or UPN is correct.'
      );
    }

    await withAgentSpinner(
      {
        start: 'Deleting agentic user...',
        success: 'Agentic user deleted.',
        error: 'Failed to delete agentic user.',
      },
      silent,
      () => deleteUser(adminToken, user.id)
    );

    await withAgentSpinner(
      {
        start: 'Deleting agent identity...',
        success: 'Agent identity deleted.',
        error: 'Failed to delete agent identity.',
      },
      silent,
      () => deleteServicePrincipal(adminToken, user.identityParentId)
    );

    return { agentIdentityId: user.identityParentId, agenticUserId: user.id };
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(
      'AGENT_IDENTITY_USER_DELETE_FAILED',
      error instanceof Error ? error.message : String(error),
      'Verify your account has permission to delete this service principal/user, then retry.'
    );
  }
}
