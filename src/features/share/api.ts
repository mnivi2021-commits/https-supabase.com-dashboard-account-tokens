import type { TKey } from '@/i18n';
import { supabase } from '@/lib/supabase';
import type { DashboardRow } from '@/features/group/api';

/** Member number + PIN that lets family view my daily report. */
export interface MemberCard {
  member_id: string; // "HT001"
  pin: string; // "2827"
}

export interface Viewer {
  viewer_id: string;
  viewer_name: string;
  created_at: string;
}

/** "ht 1", "1", "HT001" → "HT001" (empty string if there are no digits). */
export function normalizeMemberId(s: string): string {
  const digits = s.replace(/\D/g, '');
  return digits ? `HT${digits.padStart(3, '0')}` : '';
}

export const isValidPin = (s: string) => /^\d{4}$/.test(s.trim());

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export async function myMemberCard(): Promise<MemberCard> {
  const rows = await rpc<MemberCard[]>('my_member_card');
  return rows[0];
}

export async function resetMemberPin(): Promise<MemberCard> {
  const rows = await rpc<MemberCard[]>('reset_member_pin');
  return rows[0];
}

export const myViewers = () => rpc<Viewer[]>('my_viewers');
export const removeViewer = (viewerId: string) => rpc<void>('remove_viewer', { p_viewer: viewerId });
export const removeShared = (ownerId: string) => rpc<void>('remove_shared', { p_owner: ownerId });

/** Adds a member by number + PIN. Returns their name; throws an Error whose message is the reason code. */
export async function addMember(memberId: string, pin: string, name: string): Promise<string> {
  const result = await rpc<string>('add_member', {
    p_member_id: normalizeMemberId(memberId),
    p_pin: pin.trim(),
    p_name: name.trim(),
  });
  if (typeof result === 'string' && result.startsWith('OK:')) return result.slice(3);
  throw new Error(result || 'UNKNOWN');
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** Day report of everyone I added, shaped like a group dashboard row. */
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
  MEMBER_NOT_FOUND: 'err_member_not_found',
  WRONG_PIN: 'err_wrong_pin',
  TOO_MANY_TRIES: 'err_too_many_tries',
  OWN_CODE: 'err_own_code',
  TOO_MANY_PEOPLE: 'err_too_many_people',
  NO_PROFILE: 'err_no_profile_yet',
};

export function shareErrorKey(e: unknown): TKey | null {
  const msg = String((e as { message?: string })?.message ?? e);
  const hit = Object.keys(KNOWN).find((k) => msg.includes(k));
  return hit ? KNOWN[hit] : null;
}

// Tiny signal so the viewer list reloads after a member is added elsewhere (e.g. on the login screen).
const listeners = new Set<() => void>();
export function onSharedChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export const emitSharedChanged = () => listeners.forEach((cb) => cb());
