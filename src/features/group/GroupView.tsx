import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Share, View } from 'react-native';

import { Button, Card, Icon, Row, SectionTitle, Segmented, Txt } from '@/components/ui';
import { signedPhotoUrls } from '@/data/sync';
import type { TKey } from '@/i18n';
import { addDays, dayOfYear, lastNDays, monthDays, monthStartKey, prevMonthStartKey, todayKey } from '@/lib/dates';
import { BMI_COLORS, bmiCategory, workoutMeta } from '@/lib/health';
import type { GroupCategory, WorkoutType } from '@/lib/types';
import { useSettings } from '@/theme/settings';
import {
  fetchChallenge,
  fetchDashboard,
  fetchSummary,
  groupErrorKey,
  leaderboard,
  leaveGroup,
  removeMember,
  sendCheer,
  setMyCategory,
  type ChallengeRow,
  type DashboardRow,
  type Group,
  type SummaryRow,
} from './api';
import { CategoryPicker } from './NoGroup';

const MEDALS = ['🥇', '🥈', '🥉'];
const COLS = [
  { key: 'photo', w: 64 },
  { key: 'name', w: 110 },
  { key: 'weight', w: 76 },
  { key: 'bmi', w: 64 },
  { key: 'workout', w: 120 },
  { key: 'steps', w: 80 },
  { key: 'sleep', w: 66 },
  { key: 'target', w: 76 },
  { key: 'cheer', w: 76 },
] as const;

export function GroupView({
  group,
  userId,
  refreshKey,
  onLeft,
}: {
  group: Group;
  userId: string;
  refreshKey: number;
  onLeft: () => void;
}) {
  const { t, colors: c } = useSettings();
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState<ChallengeRow[]>([]);
  const [lastMonth, setLastMonth] = useState<ChallengeRow[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = group.admin_id === userId;
  const me = rows.find((r) => r.user_id === userId);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, ch, prev] = await Promise.all([
        fetchDashboard(todayKey()),
        fetchChallenge(monthStartKey()),
        fetchChallenge(prevMonthStartKey()),
      ]);
      setRows(d);
      setChallenge(ch);
      setLastMonth(prev);
      setPhotos(await signedPhotoUrls(d.map((r) => r.photo_path).filter((p): p is string => !!p)));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);

  const loadSummary = useCallback(async () => {
    const today = todayKey();
    const from = period === 'day' ? today : period === 'week' ? lastNDays(7)[0] : monthDays()[0];
    try {
      setSummary(await fetchSummary(from, today));
    } catch {}
  }, [period]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary, refreshKey]);

  const inviteLink = Linking.createURL('/join', { queryParams: { code: group.invite_code } });
  const inviteText = t('invite_message', { group: group.name, code: group.invite_code, link: inviteLink });

  const shareWhatsApp = async () => {
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteText)}`);
    } catch {
      await Share.share({ message: inviteText });
    }
  };

  const cheer = async (r: DashboardRow) => {
    try {
      await sendCheer(group.id, r.user_id);
      setRows((prev) =>
        prev.map((x) => (x.user_id === r.user_id ? { ...x, i_cheered: true, cheers_today: x.cheers_today + 1 } : x)),
      );
    } catch (e) {
      Alert.alert(t('error'), String((e as Error).message ?? e));
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
            await removeMember(r.user_id);
            void load();
          } catch (e) {
            const key = groupErrorKey(e);
            Alert.alert(t('error'), key ? t(key) : String(e));
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
          await leaveGroup().catch(() => {});
          onLeft();
        },
      },
    ]);

  const changeCategory = async (cat: GroupCategory) => {
    await setMyCategory(cat).catch(() => {});
    void load();
  };

  const cell = (w: number, child: React.ReactNode, center = true) => (
    <View style={{ width: w, paddingHorizontal: 4, alignItems: center ? 'center' : 'flex-start', justifyContent: 'center' }}>
      {child}
    </View>
  );

  const motivation = t(`motivation_${(dayOfYear() + 3) % 10}` as TKey);

  return (
    <>
      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
        <Txt size="title" bold>
          {group.name}
        </Txt>
        <Txt muted>
          {t('members_count', { n: rows.length })} {isAdmin ? `· ${t('you_are_admin')}` : ''}
        </Txt>
        <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <View>
            <Txt muted size="small">
              {t('invite_code')}
            </Txt>
            <Txt size="hero" bold color={c.primary} style={{ letterSpacing: 4 }}>
              {group.invite_code}
            </Txt>
          </View>
          <View style={{ gap: 8 }}>
            <Button small icon="whatsapp" title="WhatsApp" onPress={shareWhatsApp} style={{ backgroundColor: '#25D366', borderColor: '#25D366' }} />
            <Button small variant="outline" icon="share-variant" title={t('share')} onPress={() => Share.share({ message: inviteText })} />
          </View>
        </Row>
      </Card>

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

      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Txt color={c.danger}>{t('group_load_error')}</Txt>
          <Txt muted size="small">
            {error}
          </Txt>
        </Card>
      )}

      <Card>
        <SectionTitle>{t('group_dashboard')} · {t('today')}</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: c.border, paddingBottom: 6 }}>
              {COLS.map((col) =>
                cell(
                  col.w,
                  <Txt bold size="small" muted>
                    {t(`col_${col.key}` as TKey)}
                  </Txt>,
                ),
              )}
            </View>
            {rows.map((r) => {
              const mine = r.user_id === userId;
              const photo = r.photo_path ? photos[r.photo_path] : null;
              return (
                <Pressable
                  key={r.user_id}
                  onLongPress={isAdmin && !mine ? () => confirmRemove(r) : undefined}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                    backgroundColor: mine ? c.cardAlt : undefined,
                  }}
                >
                  {cell(
                    64,
                    photo ? (
                      <Image source={{ uri: photo }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Txt bold color={c.secondary}>
                          {(r.name[0] ?? '?').toUpperCase()}
                        </Txt>
                      </View>
                    ),
                  )}
                  {cell(
                    110,
                    <>
                      <Txt bold numberOfLines={1}>
                        {r.name}
                        {r.is_admin ? ' 👑' : ''}
                      </Txt>
                      <Txt size="small" muted>
                        {r.category === 'gain' ? t('cat_gain') : t('cat_loss')}
                      </Txt>
                    </>,
                    false,
                  )}
                  {cell(76, <Txt>{r.weight_kg != null ? `${r.weight_kg}` : '🔒'}</Txt>)}
                  {cell(
                    64,
                    r.bmi != null ? (
                      <Txt bold color={BMI_COLORS[bmiCategory(r.bmi)]}>
                        {r.bmi}
                      </Txt>
                    ) : (
                      <Txt>🔒</Txt>
                    ),
                  )}
                  {cell(
                    120,
                    r.workout_minutes == null ? (
                      <Txt>🔒</Txt>
                    ) : r.workout_minutes > 0 ? (
                      <>
                        <Row gap={2}>
                          {(r.workout_types ?? '')
                            .split(',')
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((wt) => (
                              <Icon key={wt} name={workoutMeta(wt as WorkoutType).icon} size={18} color={workoutMeta(wt as WorkoutType).color} />
                            ))}
                        </Row>
                        <Txt size="small">
                          {Math.round(r.workout_minutes)} {t('min')} · {Math.round(r.workout_calories ?? 0)} kcal
                        </Txt>
                      </>
                    ) : (
                      <Txt muted>—</Txt>
                    ),
                  )}
                  {cell(80, <Txt>{r.steps != null ? r.steps.toLocaleString() : '🔒'}</Txt>)}
                  {cell(66, <Txt>{r.sleep_hours != null ? `${r.sleep_hours}h` : '—'}</Txt>)}
                  {cell(
                    76,
                    <Txt bold color={(r.target_pct ?? 0) >= 80 ? c.primary : c.text}>
                      {r.target_pct ?? 0}%
                    </Txt>,
                  )}
                  {cell(
                    76,
                    mine ? (
                      <Txt muted>{r.cheers_today ? `👏${r.cheers_today}` : ''}</Txt>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('cheer')}
                        disabled={r.i_cheered}
                        onPress={() => cheer(r)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: r.i_cheered ? c.cardAlt : c.primarySoft,
                        }}
                      >
                        <Txt>{r.i_cheered ? '✅' : '👏'}</Txt>
                      </Pressable>
                    ),
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Txt muted size="small" style={{ marginTop: 8 }}>
          🔒 = {t('not_shared')}
          {isAdmin ? `  ·  ${t('admin_remove_hint')}` : ''}
        </Txt>
      </Card>

      <ChallengeCard rows={challenge} lastMonth={lastMonth} />

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
                🏃 {s.workout_minutes ?? '🔒'} {t('min')} · 🔥 {s.calories ?? '🔒'} kcal · 👟 {s.steps != null ? s.steps.toLocaleString() : '🔒'} · 😴{' '}
                {s.avg_sleep ?? '—'} {t('hrs')} · 💧 {s.water ?? 0} · 📅 {t('active_days_n', { n: s.active_days })}
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
            <Txt style={{ flex: 1 }} bold={i === 0}>
              {r.name}
            </Txt>
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
        <SectionTitle right={<Txt muted size="small">{t('days_left', { n: daysLeft })}</Txt>}>🏁 {t('monthly_challenge')}</SectionTitle>
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
