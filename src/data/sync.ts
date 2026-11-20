import { File } from 'expo-file-system';

import { addDays, todayKey } from '@/lib/dates';
import { AVATAR_BUCKET, isNetworkError, supabase } from '@/lib/supabase';
import {
  DEFAULT_SHARE,
  type FoodLog,
  type Profile,
  type Reminder,
  type SleepLog,
  type Targets,
  type WeightLog,
  type Workout,
} from '@/lib/types';

export type SyncTable =
  | 'profiles'
  | 'food_logs'
  | 'workouts'
  | 'sleep_logs'
  | 'weight_logs'
  | 'water_logs'
  | 'step_logs'
  | 'targets'
  | 'reminders';

/** One pending change waiting to be pushed to Supabase. */
export interface SyncOp {
  /** Dedupe key: a newer op with the same key replaces the older one. */
  key: string;
  table: SyncTable;
  type: 'upsert' | 'delete';
  row?: Record<string, unknown>;
  id?: string;
}

const ON_CONFLICT: Record<SyncTable, string> = {
  profiles: 'id',
  food_logs: 'id',
  workouts: 'id',
  sleep_logs: 'id',
  weight_logs: 'id',
  water_logs: 'user_id,date',
  step_logs: 'user_id,date',
  targets: 'user_id',
  reminders: 'id',
};

export const upsertOp = (table: SyncTable, row: Record<string, unknown>, keyPart: string): SyncOp => ({
  key: `${table}:${keyPart}`,
  table,
  type: 'upsert',
  row,
});

export const deleteOp = (table: SyncTable, id: string): SyncOp => ({
  key: `${table}:${id}`,
  table,
  type: 'delete',
  id,
});

export function profileToRow(p: Profile): Record<string, unknown> {
  return {
    name: p.name,
    age: p.age,
    gender: p.gender,
    height_cm: p.height_cm,
    height_unit: p.height_unit,
    weight_kg: p.weight_kg,
    blood_group: p.blood_group,
    photo_path: p.photo_path,
    target_weight_kg: p.target_weight_kg,
    target_date: p.target_date,
    goal_type: p.goal_type,
    share: p.share,
    updated_at: p.updated_at,
  };
}

/**
 * Pushes ops in order. Stops at the first network error so the rest stay queued.
 * Returns the ops that were handled (sent, or rejected by the server and dropped).
 */
export async function pushOps(ops: SyncOp[], userId: string): Promise<SyncOp[]> {
  const done: SyncOp[] = [];
  for (const op of ops) {
    try {
      let error: { message: string } | null = null;
      if (op.type === 'upsert' && op.row) {
        const row: Record<string, unknown> =
          op.table === 'profiles' ? { ...op.row, id: userId } : { ...op.row, user_id: userId };
        ({ error } = await supabase.from(op.table).upsert(row, { onConflict: ON_CONFLICT[op.table] }));
      } else if (op.type === 'delete' && op.id) {
        ({ error } = await supabase.from(op.table).delete().eq('id', op.id).eq('user_id', userId));
      }
      if (error) {
        if (isNetworkError(error)) break;
        console.warn(`[sync] ${op.table} rejected:`, error.message);
      }
      done.push(op);
    } catch (e) {
      if (isNetworkError(e)) break;
      console.warn('[sync] failed', e);
      done.push(op);
    }
  }
  return done;
}

export async function uploadPhoto(userId: string, uri: string): Promise<string> {
  const path = `${userId}/profile.jpg`;
  const bytes = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

/** Signed URLs for private photos (only those the viewer is allowed to see). */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

export interface RemoteData {
  profile: Profile | null;
  foods: FoodLog[];
  workouts: Workout[];
  sleeps: SleepLog[];
  weights: WeightLog[];
  water: Record<string, number>;
  steps: Record<string, number>;
  targets: Targets | null;
  reminders: Reminder[];
}

type Row = Record<string, any>;

/** Downloads this user's data (last ~13 months) from Supabase. Throws when offline. */
export async function pullAll(userId: string): Promise<RemoteData> {
  const since = addDays(todayKey(), -400);
  const [profile, workouts, sleeps, weights, water, steps, targets, reminders, foods] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('workouts').select('*').eq('user_id', userId).gte('date', since),
    supabase.from('sleep_logs').select('*').eq('user_id', userId).gte('date', since),
    supabase.from('weight_logs').select('*').eq('user_id', userId).order('date'),
    supabase.from('water_logs').select('*').eq('user_id', userId).gte('date', since),
    supabase.from('step_logs').select('*').eq('user_id', userId).gte('date', since),
    supabase.from('targets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('reminders').select('*').eq('user_id', userId),
    supabase.from('food_logs').select('*').eq('user_id', userId).gte('date', since),
  ]);
  const firstError = [profile, workouts, sleeps, weights, water, steps, targets, reminders, foods].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  const p = profile.data as Row | null;
  return {
    profile: p
      ? {
          name: p.name ?? '',
          age: Number(p.age ?? 0),
          gender: p.gender ?? 'male',
          height_cm: Number(p.height_cm ?? 0),
          height_unit: p.height_unit ?? 'cm',
          weight_kg: Number(p.weight_kg ?? 0),
          blood_group: p.blood_group ?? 'O+',
          photo_uri: null,
          photo_path: p.photo_path ?? null,
          target_weight_kg: Number(p.target_weight_kg ?? p.weight_kg ?? 0),
          target_date: p.target_date ?? todayKey(),
          goal_type: p.goal_type ?? 'maintain',
          share: { ...DEFAULT_SHARE, ...(p.share ?? {}) },
          updated_at: p.updated_at ?? new Date().toISOString(),
        }
      : null,
    foods: ((foods.data ?? []) as Row[]).map((x) => ({
      id: x.id,
      date: x.date,
      meal: x.meal,
      food_id: x.food_id ?? null,
      name: x.name,
      qty: Number(x.qty),
      serving: x.serving ?? '',
      kcal: Number(x.kcal),
      protein: Number(x.protein ?? 0),
      carbs: Number(x.carbs ?? 0),
      fat: Number(x.fat ?? 0),
      created_at: x.created_at,
    })),
    workouts: ((workouts.data ?? []) as Row[]).map((w) => ({
      id: w.id,
      date: w.date,
      type: w.type,
      minutes: w.minutes == null ? null : Number(w.minutes),
      distance_km: w.distance_km == null ? null : Number(w.distance_km),
      reps: w.reps,
      sets: w.sets,
      steps: w.steps,
      calories: Number(w.calories ?? 0),
      created_at: w.created_at,
    })),
    sleeps: ((sleeps.data ?? []) as Row[]).map((s) => ({
      id: s.id,
      date: s.date,
      sleep_at: s.sleep_at,
      wake_at: s.wake_at,
      hours: Number(s.hours),
      quality: s.quality,
    })),
    weights: ((weights.data ?? []) as Row[]).map((w) => ({
      id: w.id,
      date: w.date,
      weight_kg: Number(w.weight_kg),
      bmi: Number(w.bmi ?? 0),
    })),
    water: Object.fromEntries(
      ((water.data ?? []) as Row[]).map((w) => [w.date, Number(w.ml) || Number(w.glasses ?? 0) * 250]),
    ),
    steps: Object.fromEntries(((steps.data ?? []) as Row[]).map((s) => [s.date, Number(s.steps)])),
    targets: targets.data
      ? {
          steps: Number((targets.data as Row).steps),
          workout_minutes: Number((targets.data as Row).workout_minutes),
          sleep_hours: Number((targets.data as Row).sleep_hours),
          water_ml:
            Number((targets.data as Row).water_ml) || Number((targets.data as Row).water_glasses ?? 8) * 250,
          glass_ml: Number((targets.data as Row).glass_ml) || 200,
          monthly_weight_change_kg: Number((targets.data as Row).monthly_weight_change_kg),
        }
      : null,
    reminders: ((reminders.data ?? []) as Row[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      hour: r.hour,
      minute: r.minute,
      weekday: r.weekday,
      enabled: r.enabled,
    })),
  };
}
