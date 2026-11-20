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
  member_code?: string | null;
  /** Member's "Shared Data" switch for this group. */
  shares?: boolean;
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
  INVALID_PHONE: 'err_invalid_phone',
  OPEN_GROUP_LIMITED: 'err_open_group_limited',
  NOT_ADMIN: 'err_not_admin',
  REQUEST_NOT_FOUND: 'err_request_gone',
};

export function groupErrorKey(e: unknown): TKey | null {
  const msg = String((e as { message?: string })?.message ?? e);
  const hit = Object.keys(KNOWN).find((k) => msg.includes(k));
  return hit ? KNOWN[hit] : null;
}

// ---------------------------------------------------------------------
// Group Access v2
// ---------------------------------------------------------------------

export type GroupKind = 'private' | 'open';

export interface MyGroup extends Group {
  kind: GroupKind;
  description: string;
  helpline: string | null;
  meeting_room: string | null;
  members: number;
  is_admin: boolean;
  my_share: boolean;
}

export const myGroups = () => rpc<MyGroup[]>('my_groups');

export const createGroupV2 = (name: string, category: GroupCategory, kind: GroupKind, description: string) =>
  rpc<Group>('create_group', { p_name: name, p_category: category, p_kind: kind, p_description: description });

export interface OpenGroup {
  id: string;
  name: string;
  description: string;
  members: number;
  is_member: boolean;
}
export const listOpenGroups = (search: string) => rpc<OpenGroup[]>('list_open_groups', { p_search: search });
export const joinOpenGroup = (groupId: string, category: GroupCategory) =>
  rpc<string>('join_open_group', { p_group_id: groupId, p_category: category });

export const setMyShareData = (groupId: string, on: boolean) => rpc<void>('set_my_share_data', { p_group_id: groupId, p_on: on });
export const setGroupHelpline = (groupId: string, phone: string) =>
  rpc<void>('set_group_helpline', { p_group_id: groupId, p_phone: phone });

/** Private Jitsi room for the group (free, no account; opens in the browser or Jitsi app). */
export const meetingUrl = (room: string) => `https://meet.jit.si/HealthTracker-${room}`;

// ---------- Q&A ----------
export interface QAAnswer {
  id: string;
  user_id: string;
  author: string;
  body: string;
  created_at: string;
}
export interface QAQuestion extends QAAnswer {
  answers: QAAnswer[];
}
export const fetchQA = (groupId: string) => rpc<QAQuestion[]>('get_group_qa', { p_group_id: groupId });

export async function askQuestion(groupId: string, body: string): Promise<void> {
  const { error } = await supabase.from('group_questions').insert({ group_id: groupId, body: body.trim() });
  if (error) throw error;
}
export async function answerQuestion(questionId: string, body: string): Promise<void> {
  const { error } = await supabase.from('group_answers').insert({ question_id: questionId, body: body.trim() });
  if (error) throw error;
}
export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from('group_questions').delete().eq('id', questionId);
  if (error) throw error;
}

// ---------- Group targets & rewards ----------
export type TargetKind = 'steps' | 'workout_minutes' | 'calories' | 'weight_loss';

export interface GroupTarget {
  id: string;
  kind: TargetKind;
  value: number;
  start_date: string;
  end_date: string;
  gold: boolean;
  silver: boolean;
  points: boolean;
  total: number;
  status: 'active' | 'upcoming' | 'done';
}
export interface BoardRow {
  user_id: string;
  name: string;
  member_code: string | null;
  val: number | null;
  rnk: number | null;
  counted: boolean;
}
export interface PointsRow {
  user_id: string;
  name: string;
  gold: number;
  silver: number;
  total: number;
}

export async function fetchTargets(groupId: string, today: string): Promise<GroupTarget[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_group_targets', { p_group_id: groupId, p_today: today });
  return (rows ?? []).map((r) => ({ ...(r as unknown as GroupTarget), value: Number(r.value), total: Number(r.total) }));
}
export async function fetchBoard(targetId: string, today: string): Promise<BoardRow[]> {
  const rows = await rpc<Record<string, unknown>[]>('get_target_board', { p_target: targetId, p_today: today });
  return (rows ?? []).map((r) => ({ ...(r as unknown as BoardRow), val: num(r.val) }));
}
export const fetchPoints = (groupId: string, today: string) => rpc<PointsRow[]>('get_group_points', { p_group_id: groupId, p_today: today });

export const setGroupTarget = (
  groupId: string,
  t: { kind: TargetKind; value: number; start: string; end: string; gold: boolean; silver: boolean; points: boolean },
) =>
  rpc<string>('set_group_target', {
    p_group_id: groupId,
    p_kind: t.kind,
    p_value: t.value,
    p_start: t.start,
    p_end: t.end,
    p_gold: t.gold,
    p_silver: t.silver,
    p_points: t.points,
  });
export const deleteGroupTarget = (targetId: string) => rpc<void>('delete_group_target', { p_target: targetId });

/** Reward for a leaderboard position when the group reaches its target. */
export function rewardFor(rank: number | null, t: Pick<GroupTarget, 'gold' | 'silver' | 'points'>): { kind: 'gold' | 'silver' | 'points' | null; pts: number } {
  if (!rank) return { kind: null, pts: 0 };
  if (rank === 1 && t.gold) return { kind: 'gold', pts: 100 };
  if (rank <= 3 && rank >= 2 && t.silver) return { kind: 'silver', pts: 50 };
  if (rank >= 4 && t.points) return { kind: 'points', pts: 10 };
  return { kind: null, pts: 0 };
}
