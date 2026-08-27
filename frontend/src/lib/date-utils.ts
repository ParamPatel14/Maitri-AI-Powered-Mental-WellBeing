export function today(): string {
  return formatDate(new Date());
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatShortDate(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getDayOfWeek(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function subtractDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function daysBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function getWeekRange(endDate?: string): { from: string; to: string } {
  const to = endDate || today();
  const from = subtractDays(to, 6);
  return { from, to };
}

export function getLastNDays(n: number, endDate?: string): string[] {
  const to = endDate || today();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(subtractDays(to, i));
  }
  return days;
}

export function getMonday(s: string): string {
  const d = parseDate(s);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
}

export function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const t = today();
  if (sorted[0] !== t && sorted[0] !== subtractDays(t, 1)) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === subtractDays(sorted[i - 1], 1)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function isToday(s: string): boolean {
  return s === today();
}

export function isAfter(a: string, b: string): boolean {
  return parseDate(a).getTime() > parseDate(b).getTime();
}

export function isBeforeOrEqual(a: string, b: string): boolean {
  return parseDate(a).getTime() <= parseDate(b).getTime();
}
