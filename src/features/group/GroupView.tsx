import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';

import { Button, Card, Row, SectionTitle, Segmented, Txt } from '@/components/ui';
import { signedPhotoUrls } from '@/data/sync';
import type { TKey } from '@/i18n';
import { addDays, dayOfYear, lastNDays, monthDays, monthStartKey, prevMonthStartKey, todayKey, weekdayIndex } from '@/lib/dates';
import { BMI_COLORS, bmiCategory } from '@/lib/health';
import type { GroupCategory } from '@/lib/types';
import { useSettings } from '@/theme/settings';
import {
  fetchChallenge,
  fetchDashboard,
  fetchJoinRequests,
  fetchSummary,
  groupErrorKey,
  leaderboard,
  leaveGroup,
  removeMember,
  respondJoinRequest,
  sendCheer,
  setMyCategory,
  type ChallengeRow,
  type DashboardRow,
  type MyGroup,
  type JoinRequest,
  type SummaryRow,
} from './api';
import { AddMemberCard } from './AddMember';
import { CategoryPicker } from './NoGroup';

const MEDALS = ['🥇', '🥈', '🥉'];
/** A day counts as "target achieved" when the combined target score reaches this %. */
const ACHIEVED_PCT = 100;

export function GroupView({
  group,
  userId,
  refreshKey,
  compact = false,
  onLeft,
}: {
  group: MyGroup;
  userId: string;
  refreshKey: number;
  /** Group Login mode: only the invite card, join requests and member day reports. */
  compact?: boolean;
  onLeft: () => void;
}) {
  const { t, colors: c } = useSettings();
  const [today, setToday] = useState<DashboardRow[]>([]);
  const [yesterday, setYesterday] = useState<DashboardRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [challenge, setChallenge] = useState<ChallengeRow[]>([]);
  const [lastMonth, setLastMonth] = useState<ChallengeRow[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** The day shown in the member cards; ◀ ▶ move it back and forward. */
  const [day, setDay] = useState(todayKey());
  /** Member rows opened to show their day report. */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [userId]: true });
  const isAdmin = group.admin_id === userId;
  const me = today.find((r) => r.user_id === userId);
  const prevDay = addDays(day, -1);
  const isToday = day >= todayKey();

  const dayLabel = (key: string) => {
    if (key === todayKey()) return t('today');
    if (key === addDays(todayKey(), -1)) return t('yesterday');
    return `${t(`wd_${weekdayIndex(key)}` as TKey)} ${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, y] = await Promise.all([fetchDashboard(group.id, day), fetchDashboard(group.id, addDays(day, -1))]);
      setToday(d);
      setYesterday(y);
      setPhotos(await signedPhotoUrls(d.map((r) => r.photo_path).filter((p): p is string => !!p)));
      setRequests(isAdmin ? await fetchJoinRequests(group.id).catch(() => []) : []);
      if (!compact) {
        const [ch, prev] = await Promise.all([
          fetchChallenge(group.id, monthStartKey()),
          fetchChallenge(group.id, prevMonthStartKey()),
        ]);
        setChallenge(ch);
        setLastMonth(prev);
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [group.id, isAdmin, compact, day]);

  const loadSummary = useCallback(async () => {
    if (compact) return;
    const day = todayKey();
    const from = period === 'day' ? day : period === 'week' ? lastNDays(7)[0] : monthDays()[0];
    try {
      setSummary(await fetchSummary(group.id, from, day));
    } catch {}
  }, [group.id, period, compact]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, refreshKey]);

  const showError = (e: unknown) => {
    const key = groupErrorKey(e);
    Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
  };

  const respond = async (r: JoinRequest, approve: boolean) => {
    try {
      await respondJoinRequest(group.id, r.user_id, approve);
      void load();
    } catch (e) {
      showError(e);
    }
  };

  const cheer = async (r: DashboardRow) => {
    try {
      await sendCheer(group.id, r.user_id);
      setToday((prev) =>
        prev.map((x) => (x.user_id === r.user_id ? { ...x, i_cheered: true, cheers_today: x.cheers_today + 1 } : x)),
      );
    } catch (e) {
      showError(e);
    }
  };

  const confirmRemove = (r: DashboardRow) =>
    Alert.alert(t('remove_member'), t('remove_member_confirm', { name: r.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(group.id, r.user_id);
            void load();
          } catch (e) {
            showError(e);
          }
        },
      },
    ]);

  const confirmLeave = () =>
    Alert.alert(t('leave_group'), t('leave_group_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leave'),
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(group.id).catch(() => {});
          onLeft();
        },
      },
    ]);

  const changeCategory = async (cat: GroupCategory) => {
    await setMyCategory(group.id, cat).catch(() => {});
    void load();
  };

  const motivation = t(`motivation_${(dayOfYear() + 3) % 10}` as TKey);

  return (
    <>

      {isAdmin && requests.length > 0 && (
        <Card style={{ borderColor: c.warning, borderWidth: 2 }}>
          <SectionTitle>
            🔔 {t('join_requests')} ({requests.length})
          </SectionTitle>
          {requests.map((r) => (
            <View key={r.user_id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border, gap: 8 }}>
              <Txt bold size="large">
                {r.name}
              </Txt>
              <Txt muted>
                {[
                  r.age ? `${t('age')} ${r.age}` : null,
                  r.gender ? t(r.gender as TKey) : null,
                  r.category === 'gain' ? t('cat_gain') : t('cat_loss'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
              <Row gap={10}>
                <Button style={{ flex: 1 }} small icon="check-circle" title={t('approve')} onPress={() => respond(r, true)} />
                <Button style={{ flex: 1 }} small variant="danger" icon="close-circle" title={t('reject')} onPress={() => respond(r, false)} />
              </Row>
            </View>
          ))}
        </Card>
      )}

      {isAdmin && <AddMemberCard group={group} refreshKey={refreshKey} />}

      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Txt color={c.danger}>{t('group_load_error')}</Txt>
          <Txt muted size="small">
            {error}
          </Txt>
        </Card>
      )}

      {!compact && (
        <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
          <Row gap={10}>
            <Txt size="title">💬</Txt>
            <View style={{ flex: 1 }}>
              <Txt bold>{t('daily_motivation')}</Txt>
              <Txt>{motivation}</Txt>
            </View>
          </Row>
          {!!me?.cheers_today && (
            <Txt bold style={{ marginTop: 8 }}>
              👏 {t('cheers_received', { n: me.cheers_today })}
            </Txt>
          )}
        </Card>
      )}

      <Txt size="large" bold>
        {t('member_day_report')}
      </Txt>
      <Row gap={10}>
        <Button
          small
          variant="outline"
          icon="chevron-left"
          title={t('prev_day')}
          onPress={() => setDay(prevDay)}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt bold size="large" center>
            {dayLabel(day)}
          </Txt>
          <Txt muted size="small" center>
            {day}
          </Txt>
        </View>
        <Button
          small
          variant="outline"
          icon="chevron-right"
          title={t('next_day')}
          disabled={isToday}
          onPress={() => setDay(addDays(day, 1))}
        />
      </Row>
      {!isToday && (
        <Button small variant="ghost" icon="calendar-today" title={t('back_to_today')} onPress={() => setDay(todayKey())} />
      )}
      {today.map((r) => (
        <View key={r.user_id} style={{ gap: 8 }}>
          <MemberRow
            row={r}
            photo={r.photo_path ? photos[r.photo_path] : null}
            mine={r.user_id === userId}
            open={!!expanded[r.user_id]}
            onPress={() => setExpanded((e) => ({ ...e, [r.user_id]: !e[r.user_id] }))}
          />
          {expanded[r.user_id] && (
        <MemberCard
          dayLabel={dayLabel(day)}
          prevLabel={dayLabel(prevDay)}
          today={r}
          yesterday={yesterday.find((y) => y.user_id === r.user_id)}
          photo={r.photo_path ? photos[r.photo_path] : null}
          mine={r.user_id === userId}
          canRemove={isAdmin && r.user_id !== userId}
          onCheer={() => cheer(r)}
          onRemove={() => confirmRemove(r)}
        />
          )}
        </View>
      ))}
      <Txt muted size="small">
        🔒 = {t('not_shared')} · ✅ = {t('target_achieved')}
      </Txt>

      {!compact && (
        <>
          {group.kind !== 'open' && <ChallengeCard rows={challenge} lastMonth={lastMonth} />}

          <Card>
            <SectionTitle>{t('group_summary')}</SectionTitle>
            <Segmented
              options={[
                { value: 'day', label: t('day') },
                { value: 'week', label: t('week') },
                { value: 'month', label: t('month') },
              ]}
              value={period}
              onChange={setPeriod}
            />
            <View style={{ marginTop: 10 }}>
              {summary.map((s) => (
                <View key={s.user_id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border }}>
                  <Txt bold>{s.name}</Txt>
                  <Txt muted size="small">
                    🏃 {s.workout_minutes ?? '🔒'} {t('min')} · 🔥 {s.calories ?? '🔒'} kcal · 👟{' '}
                    {s.steps != null ? s.steps.toLocaleString() : '🔒'} · 😴 {s.avg_sleep ?? '—'} {t('hrs')} · 💧{' '}
                    {s.water_ml != null ? `${s.water_ml} ml` : '🔒'} · 📅 {t('active_days_n', { n: s.active_days })}
                  </Txt>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <SectionTitle>📋 {t('group_guidelines')}</SectionTitle>
            {t('guidelines_text')
              .split('\n')
              .map((line) => (
                <Txt key={line} style={{ marginBottom: 4 }}>
                  • {line}
                </Txt>
              ))}
          </Card>

          <Card>
            <SectionTitle>{t('my_challenge_category')}</SectionTitle>
            {me && <CategoryPicker value={me.category} onChange={changeCategory} />}
            <Button style={{ marginTop: 14 }} variant="danger" icon="logout" title={t('leave_group')} onPress={confirmLeave} />
          </Card>
        </>
      )}
    </>
  );
}

/** One person's day report: the chosen day vs the day before. Also used for share-code viewing. */
export function MemberCard({
  dayLabel,
  prevLabel,
  today: r,
  yesterday: y,
  photo,
  mine,
  canRemove,
  onCheer,
  onRemove,
  showCheer = true,
  removeLabel,
}: {
  showCheer?: boolean;
  removeLabel?: string;
  dayLabel: string;
  prevLabel: string;
  today: DashboardRow;
  yesterday?: DashboardRow;
  photo: string | null;
  mine: boolean;
  canRemove: boolean;
  onCheer?: () => void;
  onRemove: () => void;
}) {
  const { t, colors: c } = useSettings();
  const lock = '🔒';

  const status = (row?: DashboardRow) => {
    const pct = row?.target_pct ?? 0;
    const ok = pct >= ACHIEVED_PCT;
    return (
      <Txt bold color={ok ? c.primary : c.danger}>
        {ok ? '✅' : '❌'} {pct}%
      </Txt>
    );
  };

  const workout = (row?: DashboardRow) => {
    if (!row || row.workout_minutes == null) return lock;
    if (row.workout_minutes <= 0) return '—';
    const names = (row.workout_types ?? '')
      .split(',')
      .filter(Boolean)
      .map((w) => t(`w_${w}` as TKey))
      .join(', ');
    return `${names}\n${Math.round(row.workout_minutes)} ${t('min')} · ${Math.round(row.workout_calories ?? 0)} kcal`;
  };

  const food = (row?: DashboardRow) => {
    if (!row) return '—';
    if (row.food_kcal == null) return lock;
    return `${row.food_kcal} kcal\nP ${row.protein ?? 0} · C ${row.carbs ?? 0} · F ${row.fat ?? 0} g`;
  };

  // Food and water first, then workout, sleep and the rest.
  const rows: { label: string; today: ReactNode; yesterday: ReactNode }[] = [
    { label: `🍽️ ${t('food')}`, today: food(r), yesterday: food(y) },
    {
      label: `💧 ${t('water')}`,
      today: r.water_ml != null ? `${r.water_ml} ml` : lock,
      yesterday: y ? (y.water_ml != null ? `${y.water_ml} ml` : lock) : '—',
    },
    { label: `🏃 ${t('workout')}`, today: workout(r), yesterday: workout(y) },
    {
      label: `😴 ${t('sleep')}`,
      today: r.sleep_hours != null ? `${r.sleep_hours} ${t('hrs')}` : '—',
      yesterday: y?.sleep_hours != null ? `${y.sleep_hours} ${t('hrs')}` : '—',
    },
    {
      label: `👟 ${t('steps')}`,
      today: r.steps != null ? r.steps.toLocaleString() : lock,
      yesterday: y ? (y.steps != null ? y.steps.toLocaleString() : lock) : '—',
    },
    { label: `🎯 ${t('target')}`, today: status(r), yesterday: status(y) },
  ];

  return (
    <Card style={mine ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
      <Row gap={12}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: 56, height: 56, borderRadius: 28 }} />
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: c.secondarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt bold size="title" color={c.secondary}>
              {(r.name[0] ?? '?').toUpperCase()}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt bold size="large" numberOfLines={1}>
            {r.name}
            {r.is_admin ? ' 👑' : ''}
            {mine ? ` (${t('you')})` : ''}
          </Txt>
          <Row gap={10}>
            <Txt muted>⚖️ {r.weight_kg != null ? `${r.weight_kg} kg` : lock}</Txt>
            {r.bmi != null && (
              <Txt bold color={BMI_COLORS[bmiCategory(r.bmi)]}>
                BMI {r.bmi}
              </Txt>
            )}
          </Row>
        </View>
        {!mine && showCheer && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cheer')}
            disabled={r.i_cheered}
            onPress={onCheer}
            style={{ padding: 10, borderRadius: 14, backgroundColor: r.i_cheered ? c.cardAlt : c.primarySoft }}
          >
            <Txt size="large">{r.i_cheered ? '✅' : '👏'}</Txt>
          </Pressable>
        )}
      </Row>

      <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: c.border }}>
        <Row style={{ paddingVertical: 6 }}>
          <View style={{ flex: 1.1 }} />
          <View style={{ flex: 1 }}>
            <Txt bold center>
              {dayLabel}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt bold muted center>
              {prevLabel}
            </Txt>
          </View>
        </Row>
        {rows.map((row) => (
          <Row key={row.label} style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: c.border, alignItems: 'flex-start' }}>
            <View style={{ flex: 1.1 }}>
              <Txt>{row.label}</Txt>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {typeof row.today === 'string' ? (
                <Txt center size="small">
                  {row.today}
                </Txt>
              ) : (
                row.today
              )}
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {typeof row.yesterday === 'string' ? (
                <Txt center size="small" muted>
                  {row.yesterday}
                </Txt>
              ) : (
                row.yesterday
              )}
            </View>
          </Row>
        ))}
      </View>

      {r.cheers_today > 0 && (
        <Txt muted size="small" style={{ marginTop: 6 }}>
          👏 {t('cheers_received', { n: r.cheers_today })}
        </Txt>
      )}
      {canRemove && (
        <Button small variant="ghost" icon="account-remove" title={removeLabel ?? t('remove_member')} onPress={onRemove} style={{ marginTop: 6 }} />
      )}
    </Card>
  );
}

function ChallengeCard({ rows, lastMonth }: { rows: ChallengeRow[]; lastMonth: ChallengeRow[] }) {
  const { t, colors: c } = useSettings();
  const daysLeft = daysInMonthLeft();

  const board = (cat: GroupCategory, title: string) => {
    const list = leaderboard(rows, cat);
    const waiting = rows.filter((r) => r.category === cat && r.change_pct == null);
    if (!list.length && !waiting.length) return null;
    return (
      <View style={{ marginTop: 10 }}>
        <Txt bold>{title}</Txt>
        {list.map((r, i) => (
          <Row key={r.user_id} gap={10} style={{ paddingVertical: 6 }}>
            <Txt size="large">{MEDALS[i] ?? `${i + 1}.`}</Txt>
            <View style={{ flex: 1 }}>
              <Txt bold={i === 0}>{r.name}</Txt>
            </View>
            <Txt bold color={(r.change_pct ?? 0) > 0 ? c.primary : c.muted}>
              {(r.change_pct ?? 0) > 0 ? '+' : ''}
              {r.change_pct}%
            </Txt>
          </Row>
        ))}
        {waiting.map((r) => (
          <Txt key={r.user_id} muted size="small">
            {r.name}: {t('needs_weigh_in')}
          </Txt>
        ))}
      </View>
    );
  };

  const winners = (['loss', 'gain'] as GroupCategory[])
    .map((cat) => ({ cat, w: leaderboard(lastMonth, cat)[0] }))
    .filter((x) => x.w && (x.w.change_pct ?? 0) > 0);

  return (
    <>
      {winners.map(({ cat, w }) => (
        <Card key={cat} style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B', alignItems: 'center' }}>
          <Txt size="hero">🏆</Txt>
          <Txt bold color="#92400E">
            {t('last_month_winner')} · {cat === 'gain' ? t('cat_gain') : t('cat_loss')}
          </Txt>
          <Txt size="title" bold color="#78350F">
            {w!.name}
          </Txt>
          <Txt color="#92400E">
            {cat === 'gain' ? '+' : '-'}
            {w!.change_pct}% {t('body_weight')}
          </Txt>
        </Card>
      ))}
      <Card>
        <SectionTitle right={<Txt muted size="small">{t('days_left', { n: daysLeft })}</Txt>}>
          🏁 {t('monthly_challenge')}
        </SectionTitle>
        <Txt muted size="small">
          {t('challenge_rule')}
        </Txt>
        {board('loss', `⬇️ ${t('cat_loss')}`)}
        {board('gain', `⬆️ ${t('cat_gain')}`)}
        {!rows.length && <Txt muted>{t('no_challenge_data')}</Txt>}
      </Card>
    </>
  );
}

function daysInMonthLeft(): number {
  const today = todayKey();
  let n = 0;
  for (let k = today; k.slice(0, 7) === today.slice(0, 7); k = addDays(k, 1)) n++;
  return n - 1;
}

/** Compact member row (design): photo, name, role, member code with copy. */
function MemberRow({
  row,
  photo,
  mine,
  open,
  onPress,
}: {
  row: DashboardRow;
  photo: string | null;
  mine: boolean;
  open: boolean;
  onPress: () => void;
}) {
  const { t, colors: c } = useSettings();
  const copy = async () => {
    if (!row.member_code) return;
    await Clipboard.setStringAsync(row.member_code);
    Alert.alert(t('copied'), row.member_code);
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 16,
        borderWidth: mine ? 2 : 1,
        borderColor: mine ? c.primary : c.border,
        backgroundColor: c.card,
      }}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 24 }} />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Txt bold size="large" color={c.secondary}>
            {(row.name[0] ?? '?').toUpperCase()}
          </Txt>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt bold numberOfLines={1}>
          {row.name}
          {mine ? ` (${t('you')})` : ''}
        </Txt>
        <Txt size="small" muted>
          {row.is_admin ? `👑 ${t('admin')}` : `✅ ${t('member')}`}
          {row.shares === false ? ` · 🔒 ${t('not_shared')}` : ''}
        </Txt>
      </View>
      {row.member_code ? (
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel={`${t('member_code')} ${row.member_code}`}
          style={{ backgroundColor: c.primarySoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}
        >
          <Txt size="small" muted>
            {t('member_code')}
          </Txt>
          <Row gap={4}>
            <Txt bold>{row.member_code}</Txt>
            <MaterialCommunityIcons name="content-copy" size={16} color={c.primary} />
          </Row>
        </Pressable>
      ) : null}
      <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={c.muted} />
    </Pressable>
  );
}
