import type { DataState } from '@/data/store';
import { addDays, lastNDays, monthDays, monthEndKey, prevMonthStartKey, todayKey } from './dates';
import { activeMinutes, stepsToKm } from './health';
import type { WorkoutType } from './types';

export type Period = 'day' | 'week' | 'month';

/** Day keys for the period, and for the period before it (for "vs last week"). */
export function periodDays(period: Period, today = todayKey()): { days: string[]; prev: string[] } {
  if (period === 'day') return { days: [today], prev: [addDays(today, -1)] };
  if (period === 'week') return { days: lastNDays(7, today), prev: lastNDays(7, addDays(today, -7)) };
  const prevStart = prevMonthStartKey(today);
  const prev: string[] = [];
  for (let k = prevStart, end = monthEndKey(prevStart); k <= end; k = addDays(k, 1)) prev.push(k);
  return { days: monthDays(today), prev };
}

export interface WorkoutTotals {
  workouts: number;
  minutes: number;
  calories: number;
  steps: number;
  distanceKm: number;
  activeDays: number;
  perDay: { date: string; minutes: number }[];
  byType: { type: WorkoutType; minutes: number; calories: number; count: number }[];
}

export function workoutTotals(s: Pick<DataState, 'workouts' | 'steps' | 'profile'>, days: string[]): WorkoutTotals {
  const set = new Set(days);
  const list = s.workouts.filter((w) => set.has(w.date));
  const byType = new Map<WorkoutType, { type: WorkoutType; minutes: number; calories: number; count: number }>();
  const perDayMap = new Map(days.map((d) => [d, 0]));
  let loggedKm = 0;
  for (const w of list) {
    const m = activeMinutes(w);
    perDayMap.set(w.date, (perDayMap.get(w.date) ?? 0) + m);
    const e = byType.get(w.type) ?? { type: w.type, minutes: 0, calories: 0, count: 0 };
    e.minutes += m;
    e.calories += w.calories || 0;
    e.count += 1;
    byType.set(w.type, e);
    loggedKm += w.distance_km ?? 0;
  }
  const steps = days.reduce((n, d) => n + (s.steps[d] ?? 0), 0);
  const p = s.profile;
  const stepKm = p ? stepsToKm(steps, p.height_cm, p.gender) : 0;
  return {
    workouts: list.length,
    minutes: Math.round(list.reduce((n, w) => n + activeMinutes(w), 0)),
    calories: Math.round(list.reduce((n, w) => n + (w.calories || 0), 0)),
    steps,
    // Pedometer distance already includes walks/runs done with the phone; use whichever is larger.
    distanceKm: Math.round(Math.max(stepKm, loggedKm) * 10) / 10,
    activeDays: [...perDayMap.values()].filter((m) => m > 0).length,
    perDay: days.map((d) => ({ date: d, minutes: Math.round(perDayMap.get(d) ?? 0) })),
    byType: [...byType.values()]
      .map((e) => ({ ...e, minutes: Math.round(e.minutes), calories: Math.round(e.calories) }))
      .sort((a, b) => b.minutes - a.minutes),
  };
}

/** % change, or null when there is nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/** "2 h 10 min" / "45 min". */
export function formatMinutes(min: number, t: (k: 'min') => string): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${m} ${t('min')}` : `${m} ${t('min')}`;
}
