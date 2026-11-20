import type { Gender, GoalType, Profile, Workout, WorkoutType } from './types';

export type BmiCategory = 'under' | 'normal' | 'over' | 'obese';

/** Asian / Indian BMI cut-offs (WHO Asia-Pacific). */
export const BMI_RANGES: { category: BmiCategory; min: number; max: number }[] = [
  { category: 'under', min: 0, max: 18.5 },
  { category: 'normal', min: 18.5, max: 23 },
  { category: 'over', min: 23, max: 25 },
  { category: 'obese', min: 25, max: Infinity },
];

export const BMI_COLORS: Record<BmiCategory, string> = {
  under: '#3B82F6',
  normal: '#22C55E',
  over: '#F97316',
  obese: '#EF4444',
};

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calcBmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'under';
  if (bmi < 23) return 'normal';
  if (bmi < 25) return 'over';
  return 'obese';
}

/** Healthy weight range for the height, using the Asian "normal" band 18.5–22.9. */
export function idealWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [round1(18.5 * m * m), round1(22.9 * m * m)];
}

/** Mifflin–St Jeor basal metabolic rate. */
export function bmr(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/** Estimated daily calories with light activity, adjusted for the goal. */
export function dailyCalories(p: Pick<Profile, 'weight_kg' | 'height_cm' | 'age' | 'gender' | 'goal_type'>): number {
  const maintenance = bmr(p.weight_kg, p.height_cm, p.age, p.gender) * 1.375;
  const adjust: Record<GoalType, number> = { lose: -500, gain: 300, maintain: 0 };
  return Math.max(1200, Math.round((maintenance + adjust[p.goal_type]) / 10) * 10);
}

/** ~35 ml per kg body weight. Returns litres and 250 ml glasses. */
export function dailyWater(weightKg: number): { litres: number; glasses: number } {
  const litres = round1(weightKg * 0.035);
  return { litres, glasses: Math.max(8, Math.ceil(litres / 0.25)) };
}

export function goalTypeFor(weightKg: number, targetKg: number): GoalType {
  if (targetKg < weightKg - 0.4) return 'lose';
  if (targetKg > weightKg + 0.4) return 'gain';
  return 'maintain';
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = cm / 2.54;
  let feet = Math.floor(totalIn / 12);
  let inches = Math.round(totalIn - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return round1((feet * 12 + inches) * 2.54);
}

// ---------- Workouts ----------

export interface WorkoutMeta {
  type: WorkoutType;
  icon: string; // MaterialCommunityIcons name
  kind: 'time' | 'count';
  /** Metabolic equivalent (Compendium of Physical Activities). */
  met: number;
  /** Seconds per rep, used to estimate active time for count-based workouts. */
  secPerRep?: number;
  hasDistance?: boolean;
  color: string;
}

export const WORKOUTS: WorkoutMeta[] = [
  { type: 'walking', icon: 'walk', kind: 'time', met: 3.5, hasDistance: true, color: '#16A34A' },
  { type: 'jogging', icon: 'run', kind: 'time', met: 7.0, hasDistance: true, color: '#0EA5E9' },
  { type: 'running', icon: 'run-fast', kind: 'time', met: 9.8, hasDistance: true, color: '#2563EB' },
  { type: 'cycling', icon: 'bike', kind: 'time', met: 7.5, hasDistance: true, color: '#0891B2' },
  { type: 'yoga', icon: 'meditation', kind: 'time', met: 2.5, color: '#9333EA' },
  { type: 'pullups', icon: 'arm-flex', kind: 'count', met: 8.0, secPerRep: 4, color: '#EA580C' },
  { type: 'situps', icon: 'human-handsup', kind: 'count', met: 3.8, secPerRep: 3, color: '#DB2777' },
  { type: 'pushups', icon: 'weight-lifter', kind: 'count', met: 8.0, secPerRep: 3, color: '#DC2626' },
  { type: 'squats', icon: 'human', kind: 'count', met: 5.0, secPerRep: 3, color: '#CA8A04' },
  { type: 'skipping', icon: 'jump-rope', kind: 'time', met: 12.3, color: '#059669' },
];

export function workoutMeta(type: WorkoutType): WorkoutMeta {
  return WORKOUTS.find((w) => w.type === type) ?? WORKOUTS[0];
}

/** Active minutes for a workout entry (estimated from reps for count-based ones). */
export function activeMinutes(w: Pick<Workout, 'type' | 'minutes' | 'reps' | 'sets'>): number {
  const meta = workoutMeta(w.type);
  if (meta.kind === 'time') return w.minutes ?? 0;
  if (w.minutes) return w.minutes;
  return ((w.reps ?? 0) * (w.sets ?? 1) * (meta.secPerRep ?? 3)) / 60;
}

/** kcal = MET × body weight (kg) × hours. */
export function estimateCalories(
  w: Pick<Workout, 'type' | 'minutes' | 'reps' | 'sets'>,
  weightKg: number,
): number {
  const meta = workoutMeta(w.type);
  return Math.round(meta.met * weightKg * (activeMinutes(w) / 60));
}

/** Approximate stride length → distance from steps. */
export function stepsToKm(steps: number, heightCm: number, gender: Gender): number {
  const strideCm = heightCm * (gender === 'male' ? 0.415 : 0.413);
  return Math.round(((steps * strideCm) / 100_000) * 100) / 100;
}

export function percent(actual: number, target: number): number {
  if (!target) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}
