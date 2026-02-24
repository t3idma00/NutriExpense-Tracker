export function startOfDayUnix(input = Date.now()): number {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function daysFromNow(timestamp: number): number {
  const now = startOfDayUnix();
  const target = startOfDayUnix(timestamp);
  return Math.round((target - now) / 86_400_000);
}
