import type { DataState } from '@/data/store';
import type { TKey } from '@/i18n';
import { addDays, todayKey } from './dates';
import { activeMinutes, percent } from './health';
import type { FoodLog, SleepQuality, Workout } from './types';

export interface DaySummary {
  date: string;
  foods: FoodLog[];
  /** Food eaten (kcal) and macros (g). */
  kcalIn: number;
  protein: number;
  carbs: number;
  fat: number;
  workouts: Workout[];
  minutes: number;
  calories: number;
  steps: number;
  sleepHours: number;
  sleepQuality: SleepQuality | null;
  water: number;
  pct: { steps: number; minutes: number; sleep: number; water: number };
  /** Average of the four daily targets, 0–100. */
  targetPct: number;
}

export function daySummary(
  s: Pick<DataState, 'workouts' | 'steps' | 'sleeps' | 'water' | 'targets'> & { foods?: FoodLog[] },
  date: string,
): DaySummary {
  const foods = (s.foods ?? []).filter((x) => x.date === date).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sumOf = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => Math.round(foods.reduce((n, x) => n + (x[k] || 0), 0));
  const workouts = s.workouts.filter((w) => w.date === date).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const minutes = Math.round(workouts.reduce((sum, w) => sum + activeMinutes(w), 0));
  const calories = Math.round(workouts.reduce((sum, w) => sum + (w.calories || 0), 0));
  const steps = s.steps[date] ?? 0;
  const sleep = s.sleeps.find((x) => x.date === date);
  const water = s.water[date] ?? 0;
  const pct = {
    steps: percent(steps, s.targets.steps),
    minutes: percent(minutes, s.targets.workout_minutes),
    sleep: percent(sleep?.hours ?? 0, s.targets.sleep_hours),
    water: percent(water, s.targets.water_ml),
  };
  return {
    date,
    foods,
    kcalIn: sumOf('kcal'),
    protein: sumOf('protein'),
    carbs: sumOf('carbs'),
    fat: sumOf('fat'),
    workouts,
    minutes,
    calories,
    steps,
    sleepHours: sleep?.hours ?? 0,
    sleepQuality: sleep?.quality ?? null,
    water,
    pct,
    targetPct: Math.round((pct.steps + pct.minutes + pct.sleep + pct.water) / 4),
  };
}

/** Days in a row with at least one workout, ending today (or yesterday if nothing yet today). */
export function currentStreak(workouts: Workout[], today = todayKey()): number {
  const days = new Set(workouts.map((w) => w.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function longestStreak(workouts: Workout[]): number {
  const days = [...new Set(workouts.map((w) => w.date))].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export interface Badge {
  id: string;
  emoji: string;
  label: TKey;
  earned: boolean;
}

export function computeBadges(s: DataState): Badge[] {
  const longest = longestStreak(s.workouts);
  const waterDays = Object.values(s.water).filter((ml) => ml >= s.targets.water_ml).length;
  const sleepDays = s.sleeps.filter((x) => x.hours >= s.targets.sleep_hours).length;
  const p = s.profile;
  const goalReached =
    !!p &&
    s.weights.length > 1 &&
    ((p.goal_type === 'lose' && p.weight_kg <= p.target_weight_kg) ||
      (p.goal_type === 'gain' && p.weight_kg >= p.target_weight_kg));
  return [
    { id: 'first', emoji: '🎉', label: 'badge_first', earned: s.workouts.length > 0 },
    { id: 'streak3', emoji: '🔥', label: 'badge_streak3', earned: longest >= 3 },
    { id: 'streak7', emoji: '🏅', label: 'badge_streak7', earned: longest >= 7 },
    { id: 'streak30', emoji: '🏆', label: 'badge_streak30', earned: longest >= 30 },
    { id: 'steps10k', emoji: '👟', label: 'badge_steps10k', earned: Object.values(s.steps).some((n) => n >= 10_000) },
    { id: 'water7', emoji: '💧', label: 'badge_water7', earned: waterDays >= 7 },
    { id: 'sleep7', emoji: '😴', label: 'badge_sleep7', earned: sleepDays >= 7 },
    { id: 'workouts50', emoji: '💪', label: 'badge_workouts50', earned: s.workouts.length >= 50 },
    { id: 'goal', emoji: '🎯', label: 'badge_goal', earned: goalReached },
  ];
}
