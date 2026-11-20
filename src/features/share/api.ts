import type { TKey } from '@/i18n';
import { supabase } from '@/lib/supabase';
import type { DashboardRow } from '@/features/group/api';

/** "K7QM2XPA" → "K7QM-2XPA" for display. */
export const formatCode = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

/** Accepts "k7qm-2xpa", "K7QM 2XPA" … */
export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

export interface Viewer {
  viewer_id: string;
  viewer_name: string;
  created_at: string;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const myShareCode = () => rpc<string>('my_share_code');
export const resetShareCode = () => rpc<string>('reset_share_code');
export const myViewers = () => rpc<Viewer[]>('my_viewers');
export const removeViewer = (viewerId: string) => rpc<void>('remove_viewer', { p_viewer: viewerId });
export const removeShared = (ownerId: string) => rpc<void>('remove_shared', { p_owner: ownerId });

/** Returns the owner's name. */
export const addShareCode = (code: string, name: string) =>
  rpc<string>('add_share_code', { p_code: cleanCode(code), p_name: name.trim() });

const num = (v: unknown) => (v == null ? null : Number(v));

/** Day report of everyone whose code I entered, shaped like a group dashboard row. */
export async function fetchShared(day: string): Promise<DashboardRow[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_shared_dashboard', { p_day: day });
  return (rows ?? []).map((r) => ({
    user_id: String(r.user_id),
    name: String(r.name ?? '?'),
    is_admin: false,
    category: 'loss',
    photo_path: (r.photo_path as string | null) ?? null,
    weight_kg: num(r.weight_kg),
    bmi: num(r.bmi),
    workout_minutes: num(r.workout_minutes),
    workout_calories: num(r.workout_calories),
    workout_types: (r.workout_types as string | null) ?? null,
    steps: num(r.steps),
    sleep_hours: num(r.sleep_hours),
    water_ml: num(r.water_ml),
    food_kcal: num(r.food_kcal),
    protein: num(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    target_pct: num(r.target_pct),
    cheers_today: 0,
    i_cheered: false,
  }));
}

const KNOWN: Record<string, TKey> = {
  INVALID_CODE: 'err_share_code',
  OWN_CODE: 'err_own_code',
  TOO_MANY_PEOPLE: 'err_too_many_people',
  NO_PROFILE: 'err_no_profile_yet',
};

export function shareErrorKey(e: unknown): TKey | null {
  const msg = String((e as { message?: string })?.message ?? e);
  const hit = Object.keys(KNOWN).find((k) => msg.includes(k));
  return hit ? KNOWN[hit] : null;
}

// Tiny signal so the viewer list reloads after a code is added elsewhere (e.g. on the login screen).
const listeners = new Set<() => void>();
export function onSharedChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export const emitSharedChanged = () => listeners.forEach((cb) => cb());
