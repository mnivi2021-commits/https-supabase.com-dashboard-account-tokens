import type { TKey } from '@/i18n';
import { supabase } from '@/lib/supabase';
import type { GroupCategory } from '@/lib/types';

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  admin_id: string;
  created_at: string;
}

export interface DashboardRow {
  user_id: string;
  name: string;
  is_admin: boolean;
  category: GroupCategory;
  photo_path: string | null;
  weight_kg: number | null;
  bmi: number | null;
  workout_minutes: number | null;
  workout_calories: number | null;
  workout_types: string | null;
  steps: number | null;
  sleep_hours: number | null;
  water_ml: number | null;
  food_kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  target_pct: number | null;
  cheers_today: number;
  i_cheered: boolean;
}

export interface SummaryRow {
  user_id: string;
  name: string;
  workout_minutes: number | null;
  calories: number | null;
  steps: number | null;
  avg_sleep: number | null;
  water_ml: number | null;
  active_days: number;
}

export interface ChallengeRow {
  user_id: string;
  name: string;
  category: GroupCategory;
  start_weight: number | null;
  current_weight: number | null;
  change_pct: number | null;
  weigh_ins: number;
}

export interface JoinRequest {
  user_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  category: GroupCategory;
  created_at: string;
}

export interface MyRequest {
  group_id: string;
  group_name: string;
  created_at: string;
}

const num = (v: unknown) => (v == null ? null : Number(v));

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/** All groups I am a member of (RLS returns only those). */
export async function fetchMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []) as Group[];
}

export const createGroup = (name: string, category: GroupCategory) =>
  rpc<Group>('create_group', { p_name: name, p_category: category });

/** Sends a join request; returns the group's name. */
export const requestJoin = (code: string, category: GroupCategory) =>
  rpc<string>('request_join', { p_code: code.trim(), p_category: category });

export const fetchMyRequests = () => rpc<MyRequest[]>('my_join_requests');

export async function cancelRequest(groupId: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('group_join_requests')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', data.user?.id ?? '');
  if (error) throw error;
}

export const fetchJoinRequests = (groupId: string) =>
  rpc<JoinRequest[]>('list_join_requests', { p_group_id: groupId });

export const respondJoinRequest = (groupId: string, userId: string, approve: boolean) =>
  rpc<void>('respond_join_request', { p_group_id: groupId, p_user: userId, p_approve: approve });

export const leaveGroup = (groupId: string) => rpc<void>('leave_group', { p_group_id: groupId });
export const removeMember = (groupId: string, userId: string) =>
  rpc<void>('remove_member', { p_group_id: groupId, p_user: userId });
export const setMyCategory = (groupId: string, category: GroupCategory) =>
  rpc<void>('set_my_category', { p_group_id: groupId, p_category: category });

export async function fetchDashboard(groupId: string, day: string): Promise<DashboardRow[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_group_dashboard', { p_group_id: groupId, p_day: day });
  return (rows ?? []).map((r) => ({
    ...(r as unknown as DashboardRow),
    weight_kg: num(r.weight_kg),
    bmi: num(r.bmi),
    workout_minutes: num(r.workout_minutes),
    workout_calories: num(r.workout_calories),
    steps: num(r.steps),
    sleep_hours: num(r.sleep_hours),
    water_ml: num(r.water_ml),
    food_kcal: num(r.food_kcal),
    protein: num(r.protein),
    carbs: num(r.carbs),
    fat: num(r.fat),
    target_pct: num(r.target_pct),
    cheers_today: Number(r.cheers_today ?? 0),
  }));
}

export async function fetchSummary(groupId: string, from: string, to: string): Promise<SummaryRow[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_group_summary', { p_group_id: groupId, p_from: from, p_to: to });
  return (rows ?? []).map((r) => ({
    ...(r as unknown as SummaryRow),
    workout_minutes: num(r.workout_minutes),
    calories: num(r.calories),
    steps: num(r.steps),
    avg_sleep: num(r.avg_sleep),
    water_ml: num(r.water_ml),
  }));
}

export async function fetchChallenge(groupId: string, month: string): Promise<ChallengeRow[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_group_challenge', { p_group_id: groupId, p_month: month });
  return (rows ?? []).map((r) => ({
    ...(r as unknown as ChallengeRow),
    start_weight: num(r.start_weight),
    current_weight: num(r.current_weight),
    change_pct: num(r.change_pct),
  }));
}

export async function sendCheer(groupId: string, toUser: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('cheers')
    .insert({ group_id: groupId, to_user: toUser, from_user: data.user?.id });
  if (error) throw error;
}

/** Ranks members of one category by change %, best first. */
export function leaderboard(rows: ChallengeRow[], category: GroupCategory): ChallengeRow[] {
  return rows
    .filter((r) => r.category === category && r.change_pct != null)
    .sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0));
}

const KNOWN: Record<string, TKey> = {
  GROUP_FULL: 'err_group_full',
  INVALID_CODE: 'err_invalid_code',
  ALREADY_MEMBER: 'err_already_member',
  TOO_MANY_GROUPS: 'err_too_many_groups',
  NOT_ADMIN: 'err_not_admin',
  REQUEST_NOT_FOUND: 'err_request_gone',
};

export function groupErrorKey(e: unknown): TKey | null {
  const msg = String((e as { message?: string })?.message ?? e);
  const hit = Object.keys(KNOWN).find((k) => msg.includes(k));
  return hit ? KNOWN[hit] : null;
}
