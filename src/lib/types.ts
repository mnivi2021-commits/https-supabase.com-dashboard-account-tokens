export type Gender = 'male' | 'female';
export type GoalType = 'lose' | 'gain' | 'maintain';
export type HeightUnit = 'cm' | 'ft';
export type SleepQuality = 'good' | 'okay' | 'poor';
export type GroupCategory = 'loss' | 'gain';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

/** What a member allows their group to see. Photo is private by default. */
export interface ShareSettings {
  photo: boolean;
  weight: boolean;
  bmi: boolean;
  workouts: boolean;
  steps: boolean;
  sleep: boolean;
  water: boolean;
}

export const DEFAULT_SHARE: ShareSettings = {
  photo: false,
  weight: true,
  bmi: true,
  workouts: true,
  steps: true,
  sleep: true,
  water: true,
};

export interface Profile {
  name: string;
  age: number;
  gender: Gender;
  height_cm: number;
  height_unit: HeightUnit;
  weight_kg: number;
  blood_group: BloodGroup;
  /** Local file URI of the photo on this device. Never synced. */
  photo_uri: string | null;
  /** Path inside the private Supabase "avatars" bucket. */
  photo_path: string | null;
  /** True when the local photo still has to be uploaded. */
  photo_pending?: boolean;
  target_weight_kg: number;
  target_date: string; // YYYY-MM-DD
  goal_type: GoalType;
  share: ShareSettings;
  updated_at: string;
}

export const WORKOUT_TYPES = [
  'walking',
  'jogging',
  'running',
  'cycling',
  'yoga',
  'pullups',
  'situps',
  'pushups',
  'squats',
  'skipping',
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutType;
  minutes: number | null;
  distance_km: number | null;
  reps: number | null;
  sets: number | null;
  steps: number | null;
  calories: number;
  created_at: string;
}

export interface SleepLog {
  id: string;
  date: string; // wake-up date
  sleep_at: string; // ISO
  wake_at: string; // ISO
  hours: number;
  quality: SleepQuality;
}

export interface WeightLog {
  id: string;
  date: string;
  weight_kg: number;
  bmi: number;
}

export interface Targets {
  steps: number;
  workout_minutes: number;
  sleep_hours: number;
  /** Daily water goal in millilitres. */
  water_ml: number;
  /** Size of one glass in ml — each tap on the water counter adds this much. */
  glass_ml: number;
  monthly_weight_change_kg: number;
}

export const GLASS_SIZES = [100, 200, 250] as const;

export const DEFAULT_TARGETS: Targets = {
  steps: 8000,
  workout_minutes: 30,
  sleep_hours: 8,
  water_ml: 2000,
  glass_ml: 200,
  monthly_weight_change_kg: 2,
};

export type ReminderKind = 'workout' | 'bedtime' | 'weight';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  hour: number;
  minute: number;
  /** 1 = Sunday … 7 = Saturday (expo-notifications convention). Only for weekly reminders. */
  weekday: number | null;
  enabled: boolean;
}
