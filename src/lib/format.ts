import type { TKey } from '@/i18n';
import type { Workout } from './types';

export function workoutDetail(w: Workout, t: (k: TKey) => string): string {
  const parts: string[] = [];
  if (w.minutes) parts.push(`${w.minutes} ${t('min')}`);
  if (w.reps) parts.push(`${w.reps} × ${w.sets ?? 1}`);
  if (w.distance_km) parts.push(`${w.distance_km} km`);
  if (w.steps) parts.push(`${w.steps.toLocaleString()} ${t('steps')}`);
  parts.push(`${w.calories} kcal`);
  return parts.join(' · ');
}
