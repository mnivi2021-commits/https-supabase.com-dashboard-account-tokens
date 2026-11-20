/** All "day keys" are local dates formatted as YYYY-MM-DD. */

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** The last `n` day keys ending today, oldest first. */
export function lastNDays(n: number, end = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function monthStartKey(key = todayKey()): string {
  return key.slice(0, 8) + '01';
}

export function monthEndKey(key = todayKey()): string {
  const d = parseKey(monthStartKey(key));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return dateKey(d);
}

export function prevMonthStartKey(key = todayKey()): string {
  const d = parseKey(monthStartKey(key));
  d.setMonth(d.getMonth() - 1);
  return dateKey(d);
}

/** Every day of the month containing `key`, up to today if it is the current month. */
export function monthDays(key = todayKey()): string[] {
  const start = monthStartKey(key);
  const end = monthEndKey(key);
  const today = todayKey();
  const last = end < today ? end : today;
  const days: string[] = [];
  for (let k = start; k <= last; k = addDays(k, 1)) days.push(k);
  return days;
}

export function weekdayIndex(key: string): number {
  return parseKey(key).getDay(); // 0 = Sunday
}

export function formatTime(d: Date): string {
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatHourMinute(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return formatTime(d);
}

export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}
