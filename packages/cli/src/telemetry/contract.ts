export interface PostinstallAttributes {
  schemaVersion: number;
  cliVersion: string;
  os: string;
  installationId: string;
  invocationId: string;
  timestamp: string;
}

export type OperationName =
  | 'project.create'
  | 'auth.login'
  | 'app.register'
  | 'app.configure'
  | 'app.install_link_open';

export type FailureCategory =
  | 'authentication'
  | 'validation'
  | 'permission'
  | 'not_found'
  | 'service'
  | 'unknown';
export type Outcome = 'succeeded' | 'failed' | 'cancelled';
export type EventName = 'teams.cli.first_use' | 'teams.cli.operation' | 'teams.cli.identity_link';
export type AttemptOrigin = 'project.create' | 'registration';

export interface IdentityFacts {
  clientId?: string;
  botId?: string;
  teamsAppId?: string;
  tenantId?: string;
}

export interface RegistrationFacts extends IdentityFacts {
  registrationStage?: 'identity_created' | 'app_imported' | 'bot_registered';
}

export interface OperationFacts extends RegistrationFacts {
  language?: 'typescript' | 'python' | 'csharp';
  template?: string;
  authMode?: 'cached' | 'browser' | 'device_code';
  transport?: 'http' | 'socket';
  endpointConfigured?: boolean;
  changed?: boolean;
}

export interface EventAttributes extends PostinstallAttributes, OperationFacts {
  phase?: 'started' | 'completed';
  operation?: OperationName;
  operationId?: string;
  startedAt?: string;
  outcome?: Outcome;
  durationMs?: number;
  failureCategory?: FailureCategory;
  attemptId?: string;
  attemptStartedAt?: string;
  attemptOrigin?: AttemptOrigin;
}

export function safeFacts(facts: OperationFacts): OperationFacts {
  const result: OperationFacts = {};
  for (const key of ['clientId', 'botId', 'teamsAppId', 'tenantId'] as const) {
    if (isGuid(facts[key])) result[key] = facts[key];
  }
  if (
    facts.registrationStage === 'identity_created' ||
    facts.registrationStage === 'app_imported' ||
    facts.registrationStage === 'bot_registered'
  )
    result.registrationStage = facts.registrationStage;
  if (['typescript', 'python', 'csharp'].includes(facts.language ?? ''))
    result.language = facts.language;
  if (['echo', 'graph', 'tab'].includes(facts.template ?? '')) result.template = facts.template;
  if (['cached', 'browser', 'device_code'].includes(facts.authMode ?? ''))
    result.authMode = facts.authMode;
  if (facts.transport === 'http' || facts.transport === 'socket')
    result.transport = facts.transport;
  if (typeof facts.endpointConfigured === 'boolean')
    result.endpointConfigured = facts.endpointConfigured;
  if (typeof facts.changed === 'boolean') result.changed = facts.changed;
  return result;
}

export function failureCategory(error: unknown): FailureCategory {
  if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string')
    return 'unknown';
  if (error.code.startsWith('AUTH_')) return 'authentication';
  if (
    error.code.startsWith('VALIDATION_') ||
    error.code === 'INVALID_ICON' ||
    error.code === 'TENANT_MISMATCH'
  )
    return 'validation';
  if (error.code.startsWith('PERMISSION_')) return 'permission';
  if (error.code.startsWith('NOT_FOUND_')) return 'not_found';
  if (error.code === 'API_ERROR' || error.code === 'API_ARM_ERROR') return 'service';
  return 'unknown';
}

export function isGuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
    value !== '00000000-0000-0000-0000-000000000000'
  );
}
