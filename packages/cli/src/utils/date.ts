const formatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return formatter.format(new Date(date));
}
