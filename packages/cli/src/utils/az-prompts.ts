import { confirm, search, select } from '@inquirer/prompts';
import pc from 'picocolors';
import { runAz } from './az.js';
import { isAutoConfirm, isInteractive } from './interactive.js';
import { logger } from './logger.js';
import { CliError } from './errors.js';
import { createSilentSpinner } from './spinner.js';

interface AzSubscription {
  id: string;
  name: string;
  isDefault: boolean;
}

interface AzResourceGroup {
  name: string;
  location: string;
}

let cachedSubscription: AzSubscription | null = null;

/**
 * Resolve the Azure subscription to use.
 * - Flag value always wins
 * - Session cache used if already confirmed
 * - Interactive: confirm default or pick from list
 * - Non-interactive: required flag
 */
export async function resolveSubscription(flagValue?: string): Promise<string> {
  if (flagValue) return flagValue;

  if (cachedSubscription) return cachedSubscription.id;

  if (!isInteractive()) {
    throw new CliError(
      'VALIDATION_MISSING',
      '--subscription is required in non-interactive mode.',
      'Use `az account list` to find your subscription ID.'
    );
  }

  // Get current default subscription
  let spinner = createSilentSpinner('Fetching Azure subscriptions...').start();
  const current = await runAz<AzSubscription>(['account', 'show']);
  spinner.stop();

  if (isAutoConfirm()) {
    cachedSubscription = current;
    return current.id;
  }

  const useDefault = await confirm({
    message: `Azure subscription: ${pc.bold(current.name)} (${pc.dim(current.id)}). Use this?`,
    default: true,
  });

  if (useDefault) {
    cachedSubscription = current;
    return current.id;
  }

  // Pick a different subscription
  spinner = createSilentSpinner('Fetching Azure subscriptions...').start();
  const subs = await runAz<AzSubscription[]>(['account', 'list']);
  spinner.stop();
  const picked = await search<AzSubscription>({
    message: 'Select a subscription',
    source: (term) => {
      const filtered = term
        ? subs.filter((s) => s.name.toLowerCase().includes(term.toLowerCase()))
        : subs;
      return filtered.map((s) => ({
        name: `${s.name} ${pc.dim(`(${s.id})`)}`,
        value: s,
      }));
    },
  });

  cachedSubscription = picked;
  return picked.id;
}

/**
 * Get the tenantId of the current Azure CLI session.
 * Returns null if az CLI is not logged in or the call fails.
 */
export async function getAzTenantId(): Promise<string | null> {
  try {
    const account = await runAz<{ tenantId: string }>(['account', 'show']);
    return account.tenantId;
  } catch {
    return null;
  }
}

/**
 * Throw if the MSAL tenant (Teams login) and Azure CLI tenant differ.
 * No-op if the Azure CLI tenant cannot be determined.
 */
export async function ensureTenantMatch(msalTenantId: string): Promise<void> {
  const azureTenantId = await getAzTenantId();
  if (!azureTenantId) return;
  if (msalTenantId === azureTenantId) return;

  throw new CliError(
    'TENANT_MISMATCH',
    `Tenant mismatch: Teams login tenant (${msalTenantId}) does not match Azure CLI tenant (${azureTenantId}).`,
    `Run \`az login --tenant ${msalTenantId}\` to align your Azure CLI session.`
  );
}

/**
 * Resolve the Azure resource group to use.
 * - Flag value always wins (assumes existing group)
 * - Interactive: pick existing or create new
 * - Non-interactive: required flag
 */
export async function resolveResourceGroup(
  subscription: string,
  flagValue?: string
): Promise<string> {
  if (flagValue) return flagValue;

  if (!isInteractive()) {
    throw new CliError(
      'VALIDATION_MISSING',
      '--resource-group is required in non-interactive mode.'
    );
  }

  const rgSpinner = createSilentSpinner('Fetching resource groups...').start();
  const groups = await runAz<AzResourceGroup[]>(['group', 'list', '--subscription', subscription]);
  rgSpinner.stop();

  if (groups.length === 0) {
    throw new CliError(
      'NOT_FOUND_RESOURCE_GROUP',
      'No resource groups found in this subscription.',
      'Use `--resource-group <name> --create-resource-group` to create one.'
    );
  }

  const picked = await search<string>({
    message: 'Select a resource group',
    source: (term) => {
      const filtered = term
        ? groups.filter((g) => g.name.toLowerCase().includes(term.toLowerCase()))
        : groups;
      return filtered.map((g) => ({
        name: `${g.name} ${pc.dim(`(${g.location})`)}`,
        value: g.name,
      }));
    },
  });

  return picked;
}
