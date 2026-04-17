/**
 * Convert a stored config value to its user-friendly display form.
 */
export function displayValue(key: string, value: string): string {
  if (key === 'default-bot-location' && value === 'tm') return 'teams-managed';
  return value;
}
