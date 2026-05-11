import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSilentSpinner } from '../utils/spinner.js';
import { registerBot, fetchBot, updateBot } from './tdp.js';
import { runAz } from '../utils/az.js';
import { logger } from '../utils/logger.js';

export interface CreateBotOpts {
  botId: string;
  name: string;
  endpoint?: string;
  description?: string;
  /**
   * Azure resource name for the bot. Defaults to `botId` to keep historical
   * behavior. Allows callers to create bots whose Azure resource name differs
   * from the MicrosoftAppId (e.g. human-readable names from Portal/Bicep).
   */
  azureName?: string;
}

export interface BotHandler {
  createBot(opts: CreateBotOpts): Promise<void>;
  validateCreateBot(opts: CreateBotOpts): Promise<void>;
  updateEndpoint(botId: string, endpoint: string): Promise<void>;
}

export interface AzureContext {
  subscription: string;
  resourceGroup: string;
  region: string;
  tenantId: string;
  /**
   * Azure resource name of the bot. Optional for callers that haven't
   * discovered an existing bot (e.g. create flows that derive the name
   * from botId). Discovery sets this to the real resource name, which
   * may differ from the MicrosoftAppId.
   */
  name?: string;
}

/**
 * Bot handler that creates/manages Teams-managed bots via TDP.
 */
class TdpBotHandler implements BotHandler {
  constructor(private token: string) {}

  async createBot(opts: CreateBotOpts): Promise<void> {
    await registerBot(this.token, {
      botId: opts.botId,
      name: opts.name,
      endpoint: opts.endpoint ?? '',
    });
  }

  async validateCreateBot(): Promise<void> {
    // TDP creation has no pre-validation — it either works or throws
  }

  async updateEndpoint(botId: string, endpoint: string): Promise<void> {
    const bot = await fetchBot(this.token, botId);
    await updateBot(this.token, { ...bot, messagingEndpoint: endpoint });
  }
}

/**
 * Generate an ARM template for Azure Bot Service.
 */
function generateArmTemplate(opts: CreateBotOpts, azure: AzureContext): object {
  return {
    $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
    contentVersion: '1.0.0.0',
    resources: [
      {
        type: 'Microsoft.BotService/botServices',
        apiVersion: '2021-03-01',
        name: opts.azureName || opts.botId,
        location: 'global',
        kind: 'azurebot',
        sku: { name: 'F0' },
        properties: {
          displayName: opts.description || opts.name,
          endpoint: opts.endpoint || '',
          msaAppId: opts.botId,
          msaAppType: 'SingleTenant',
          msaAppTenantId: azure.tenantId,
        },
      },
    ],
  };
}

/**
 * Write an ARM template to a temp file, run the callback, then clean up.
 */
async function withArmTemplate(
  template: object,
  fn: (templatePath: string) => Promise<void>
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'teams-cli-'));
  const templatePath = join(dir, 'azuredeploy.json');
  try {
    writeFileSync(templatePath, JSON.stringify(template, null, 2));
    await fn(templatePath);
  } finally {
    try {
      unlinkSync(templatePath);
    } catch {
      /* best effort cleanup */
    }
  }
}

/**
 * Bot handler that creates/manages bots in Azure via az CLI.
 * Uses ARM templates with what-if validation.
 */
class AzureBotHandler implements BotHandler {
  constructor(private azure: AzureContext) {}

  async createBot(opts: CreateBotOpts): Promise<void> {
    const template = generateArmTemplate(opts, this.azure);

    await withArmTemplate(template, async (templatePath) => {
      // Deploy the ARM template
      logger.debug(
        `Deploying Azure bot: ${opts.botId} (${opts.name}) in ${this.azure.resourceGroup}`
      );
      await runAz([
        'deployment',
        'group',
        'create',
        '--resource-group',
        this.azure.resourceGroup,
        '--template-file',
        templatePath,
        '--subscription',
        this.azure.subscription,
      ]);
    });

    // Enable the Microsoft Teams channel (ARM template doesn't configure channels)
    logger.debug('Enabling Microsoft Teams channel');
    await runAz([
      'bot',
      'msteams',
      'create',
      '--name',
      opts.azureName || opts.botId,
      '--resource-group',
      this.azure.resourceGroup,
      '--subscription',
      this.azure.subscription,
    ]);
  }

  /**
   * Validate that createBot would succeed without creating any resources.
   * Uses ARM template what-if to check permissions, name availability, etc.
   * Throws if validation fails.
   */
  async validateCreateBot(opts: CreateBotOpts): Promise<void> {
    const template = generateArmTemplate(opts, this.azure);

    await withArmTemplate(template, async (templatePath) => {
      logger.debug('Running ARM what-if validation');
      await runAz([
        'deployment',
        'group',
        'what-if',
        '--resource-group',
        this.azure.resourceGroup,
        '--template-file',
        templatePath,
        '--subscription',
        this.azure.subscription,
        '--no-pretty-print',
      ]);
    });
  }

  async updateEndpoint(botId: string, endpoint: string): Promise<void> {
    // Use the discovered Azure resource name when available; falls back to
    // botId for fresh deployments where the convention still holds.
    const resourceName = this.azure.name ?? botId;
    logger.debug(`Updating Azure bot endpoint: ${resourceName} → ${endpoint}`);
    await runAz([
      'bot',
      'update',
      '--name',
      resourceName,
      '--resource-group',
      this.azure.resourceGroup,
      '--endpoint',
      endpoint,
      '--subscription',
      this.azure.subscription,
    ]);
  }
}

export function createTdpBotHandler(token: string): BotHandler {
  return new TdpBotHandler(token);
}

export function createAzureBotHandler(context: AzureContext): BotHandler {
  return new AzureBotHandler(context);
}

/**
 * Discover the Azure context for an existing bot by looking up its resource.
 *
 * Bots created by this CLI use the MicrosoftAppId as the Azure resource name,
 * so we try that fast-path first. For bots created via Portal/Bicep/Terraform
 * the resource name can be anything, so we fall back to scanning all bot
 * resources in the active subscription and matching on `properties.msaAppId`.
 */
export async function discoverAzureBot(
  botId: string,
  silent = false
): Promise<AzureContext | null> {
  const spinner = createSilentSpinner('Discovering Azure bot...', silent).start();
  try {
    const bot = await findBotByName(botId) ?? await findBotByMsaAppId(botId);
    if (!bot) {
      spinner.stop();
      return null;
    }
    const account = await runAz<{ id: string; tenantId: string }>(['account', 'show']);
    spinner.success({ text: 'Azure bot discovered' });
    return {
      // Discovered bot may live in a different subscription than the active
      // one (graph queries cross subs); prefer what we found.
      subscription: bot.subscription ?? account.id,
      resourceGroup: bot.resourceGroup,
      region: bot.location,
      tenantId: account.tenantId,
      name: bot.name,
    };
  } catch {
    spinner.stop();
    return null;
  }
}

interface BotResource {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  /** Subscription containing the bot. Parsed from the ARM id when needed. */
  subscription?: string;
  properties?: { msaAppId?: string } | null;
}

/** Extract the subscription GUID from an ARM resource id. */
function subscriptionFromArmId(id: string): string | undefined {
  const m = /\/subscriptions\/([^/]+)\//i.exec(id);
  return m?.[1];
}

/** Fast path: assume Azure resource name == MicrosoftAppId. */
async function findBotByName(botId: string): Promise<BotResource | null> {
  try {
    const results = await runAz<BotResource[]>([
      'resource',
      'list',
      '--resource-type',
      'Microsoft.BotService/botServices',
      '--name',
      botId,
    ]);
    return results[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fallback: query Azure Resource Graph for any Bot Service in scope whose
 * `properties.msaAppId` matches. Single round-trip across the user's
 * accessible subscriptions. Requires the `resource-graph` az extension,
 * which the az CLI auto-installs on first use by default.
 *
 * If the graph query fails (extension blocked, etc.), falls back to listing
 * resources and fetching each one's properties in parallel.
 */
async function findBotByMsaAppId(botId: string): Promise<BotResource | null> {
  const graphHit = await findBotByMsaAppIdViaGraph(botId);
  if (graphHit) return graphHit;
  return findBotByMsaAppIdViaList(botId);
}

// Bot ids are AAD client ids (GUIDs). Reject anything else before using them
// in interpolated contexts (e.g. KQL queries) to keep the surface tight.
const BOT_ID_PATTERN = /^[0-9a-fA-F-]{36}$/;

async function findBotByMsaAppIdViaGraph(botId: string): Promise<BotResource | null> {
  if (!BOT_ID_PATTERN.test(botId)) return null;
  try {
    const query =
      "Resources | where type =~ 'microsoft.botservice/botservices' " +
      `| where properties.msaAppId =~ '${botId}' ` +
      '| project id, name, resourceGroup, location, subscriptionId, msaAppId=properties.msaAppId ' +
      '| limit 1';
    const result = await runAz<{
      data: Array<BotResource & { msaAppId: string; subscriptionId?: string }>;
    }>(['graph', 'query', '-q', query]);
    const hit = result?.data?.[0];
    if (!hit) return null;
    return {
      id: hit.id,
      name: hit.name,
      resourceGroup: hit.resourceGroup,
      location: hit.location,
      subscription: hit.subscriptionId ?? subscriptionFromArmId(hit.id),
      properties: { msaAppId: hit.msaAppId },
    };
  } catch {
    return null;
  }
}

async function findBotByMsaAppIdViaList(botId: string): Promise<BotResource | null> {
  try {
    const all = await runAz<BotResource[]>([
      'resource',
      'list',
      '--resource-type',
      'Microsoft.BotService/botServices',
    ]);
    // Bounded concurrency + early exit: walk the list in small batches and
    // stop as soon as a match is found. Avoids spawning N `az` processes at
    // once for users with many bots.
    const BATCH = 5;
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (bot) => {
          try {
            const full = await runAz<BotResource>(['resource', 'show', '--ids', bot.id]);
            return { ...bot, properties: full.properties };
          } catch {
            return null;
          }
        })
      );
      for (const b of results) {
        if (b && b.properties?.msaAppId === botId) return b;
      }
    }
    return null;
  } catch {
    return null;
  }
}
