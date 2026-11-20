export interface PostinstallAttributes {
  schemaVersion: number;
  cliVersion: string;
  os: string;
  installationId: string;
  invocationId: string;
  timestamp: string;
}

export function isGuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
    value !== '00000000-0000-0000-0000-000000000000'
  );
}
