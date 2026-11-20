import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button, Card, Icon, Row, SectionTitle, Txt, type IconName } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { BigRing } from '@/components/WorkoutUi';
import type { TKey } from '@/i18n';
import { addDays, monthEndKey, monthStartKey, parseKey, todayKey } from '@/lib/dates';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import {
  deleteGroupTarget,
  fetchBoard,
  fetchPoints,
  fetchTargets,
  groupErrorKey,
  rewardFor,
  setGroupTarget,
  type BoardRow,
  type GroupTarget,
  type MyGroup,
  type PointsRow,
  type TargetKind,
} from './api';

const KINDS: { kind: TargetKind; icon: IconName; unit: string; label: TKey }[] = [
  { kind: 'steps', icon: 'shoe-print', unit: 'steps', label: 'steps' },
  { kind: 'workout_minutes', icon: 'dumbbell', unit: 'min', label: 'workout_minutes' },
  { kind: 'calories', icon: 'fire', unit: 'kcal', label: 'calories_burned' },
  { kind: 'weight_loss', icon: 'scale-bathroom', unit: 'kg', label: 'weight_loss' },
];
const kindMeta = (k: TargetKind) => KINDS.find((x) => x.kind === k) ?? KINDS[0];
const fmt = (n: number, k: TargetKind) => (k === 'weight_loss' ? n.toFixed(1) : Math.round(n).toLocaleString());

const COIN: Record<'gold' | 'silver' | 'points', { emoji: string; label: TKey; color: string }> = {
  gold: { emoji: '🥇', label: 'gold_coin', color: '#F59E0B' },
  silver: { emoji: '🥈', label: 'silver_coin', color: '#94A3B8' },
  points: { emoji: '⭐', label: 'points', color: '#F59E0B' },
};

function dateRange(a: string, b: string) {
  const f = (k: string) => `${Number(k.slice(8))}/${Number(k.slice(5, 7))}`;
  return `${f(a)} – ${f(b)}`;
}

/** Target tab: current target progress, my contribution, leaderboard, celebration, upcoming target, admin form. */
export function TargetTab({ group, userId, refreshKey }: { group: MyGroup; userId: string; refreshKey: number }) {
  const { t, colors: c, isDark } = useSettings();
  const [targets, setTargets] = useState<GroupTarget[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const today = todayKey();
  const navy = isDark ? c.text : BRAND.navy;

  const current = targets.find((x) => x.status === 'active') ?? targets.find((x) => x.status === 'done');
  const upcoming = [...targets].filter((x) => x.status === 'upcoming').sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const load = useCallback(async () => {
    try {
      const list = await fetchTargets(group.id, today);
      setTargets(list);
      const cur = list.find((x) => x.status === 'active') ?? list.find((x) => x.status === 'done');
      setBoard(cur ? await fetchBoard(cur.id, today) : []);
    } catch {}
  }, [group.id, today]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const meRow = board.find((b) => b.user_id === userId);
  const achieved = !!current && current.total >= current.value;
  const pct = current ? Math.round((current.total / current.value) * 100) : 0;
  const myShare = current && meRow?.val ? Math.round((meRow.val / current.value) * 100) : 0;
  const myReward = current && achieved ? rewardFor(meRow?.rnk ?? null, current) : null;

  return (
    <>
      {current && achieved && (
        <Card style={{ backgroundColor: '#FFF7E0', borderColor: '#F59E0B', alignItems: 'center', gap: 6 }}>
          <Txt style={{ fontSize: 56, lineHeight: 64 }}>🏆</Txt>
          <Txt bold style={{ fontSize: 30, lineHeight: 36, fontStyle: 'italic' }} color="#BE185D">
            {t('you_did_it')}
          </Txt>
          <Row gap={6}>
            <MaterialCommunityIcons name="check-circle" size={22} color={BRAND.green} />
            <Txt bold color="#0F241B">
              {t('target_completed')}
            </Txt>
          </Row>
          <View style={{ alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, gap: 4 }}>
            <Txt color="#0F241B">
              👥 {t('group_target')}: <Txt bold color="#0F241B">{fmt(current.value, current.kind)} {kindMeta(current.kind).unit}</Txt>
            </Txt>
            <Txt color="#0F241B">
              ✅ {t('achieved')}: <Txt bold color="#0F241B">{fmt(current.total, current.kind)}</Txt>
            </Txt>
            <Txt color="#0F241B">
              🙋 {t('your_contribution')}: <Txt bold color="#0F241B">{fmt(meRow?.val ?? 0, current.kind)} ({myShare}%)</Txt>
            </Txt>
          </View>
          {myReward?.kind && (
            <Txt bold size="large" color="#0F241B">
              {COIN[myReward.kind].emoji} {t(COIN[myReward.kind].label)} +{myReward.pts}
            </Txt>
          )}
          <Txt bold size="large" color={BRAND.green}>
            🎉 {t('great_team_work')}
          </Txt>
        </Card>
      )}

      {current ? (
        <Card>
          <SectionTitle>
            <Icon name="bullseye-arrow" color={BRAND.green} /> {t('group_target_progress')}
          </SectionTitle>
          <Txt muted style={{ marginBottom: 8 }}>
            {current.status === 'done' ? t('ended') : t('this_period')} ({dateRange(current.start_date, current.end_date)})
          </Txt>
          <Row gap={12}>
            <BigRing pct={pct} caption={t(kindMeta(current.kind).label)} size={120} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt bold color={navy}>
                {t('group_target')}
              </Txt>
              <Txt size="large" bold>
                {fmt(current.total, current.kind)} / {fmt(current.value, current.kind)} {kindMeta(current.kind).unit}
              </Txt>
              <Txt muted size="small">
                {t('my_contribution')}: <Txt bold>{fmt(meRow?.val ?? 0, current.kind)}</Txt> ({myShare}%)
              </Txt>
              {meRow && !meRow.counted && (
                <Txt size="small" color={c.warning}>
                  🔒 {t('not_counted_sharing_off')}
                </Txt>
              )}
            </View>
          </Row>
        </Card>
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <Txt size="hero">🎯</Txt>
          <Txt muted center>
            {group.is_admin ? t('no_target_admin') : t('no_target_member')}
          </Txt>
        </Card>
      )}

      {current && board.length > 0 && (
        <Card>
          <SectionTitle>
            <Icon name="chart-bar" color={navy} /> {t('member_leaderboard')}
          </SectionTitle>
          {board.map((b) => {
            const r = rewardFor(b.rnk, current);
            const top = b.rnk && b.rnk <= 3;
            return (
              <Row
                key={b.user_id}
                gap={10}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  borderRadius: 12,
                  backgroundColor: b.rnk === 1 ? '#FEF3C7' : b.rnk === 2 ? '#F1F5F9' : b.rnk === 3 ? '#FDE7DA' : undefined,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: top ? BRAND.orange : c.cardAlt,
                  }}
                >
                  <Txt bold size="small" color={top ? '#FFFFFF' : c.text}>
                    {b.rnk ?? '–'}
                  </Txt>
                </View>
                <Txt bold style={{ flex: 1 }} numberOfLines={1} color={top ? '#0F241B' : c.text}>
                  {b.name}
                  {b.user_id === userId ? ` (${t('you')})` : ''}
                </Txt>
                <Txt bold color={top ? '#0F241B' : c.text}>
                  {b.counted ? fmt(b.val ?? 0, current.kind) : '🔒'}
                </Txt>
                <Txt size="small" style={{ width: 84, textAlign: 'right' }} color={top ? '#0F241B' : c.muted}>
                  {r.kind ? `${COIN[r.kind].emoji} +${r.pts}` : ''}
                </Txt>
              </Row>
            );
          })}
          <Txt muted size="small" style={{ marginTop: 6 }}>
            {achieved ? t('rewards_earned_note') : t('rewards_if_reached')}
          </Txt>
        </Card>
      )}

      {upcoming && (
        <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary, gap: 6 }}>
          <SectionTitle>
            <Icon name="calendar-clock" color={navy} /> {t('upcoming_group_target')}
          </SectionTitle>
          <Row gap={12}>
            <Icon name={kindMeta(upcoming.kind).icon} size={44} color={BRAND.green} />
            <View style={{ flex: 1 }}>
              <Txt bold color={navy}>
                {t('next_challenge')}
              </Txt>
              <Txt bold size="title" color={BRAND.green}>
                {fmt(upcoming.value, upcoming.kind)} {kindMeta(upcoming.kind).unit}
              </Txt>
              <Txt muted>📅 {dateRange(upcoming.start_date, upcoming.end_date)}</Txt>
            </View>
          </Row>
          <Txt bold style={{ fontStyle: 'italic' }} color="#BE185D">
            {t('be_ready')}
          </Txt>
          {t('be_ready_tips')
            .split('\n')
            .map((line) => (
              <Txt key={line}>✅ {line}</Txt>
            ))}
        </Card>
      )}

      {group.is_admin && (
        <>
          <GradientButton
            title={showForm ? t('close') : t('set_new_target')}
            icon={showForm ? 'close' : 'bullseye-arrow'}
            colors={[BRAND.greenLight, BRAND.green]}
            onPress={() => setShowForm(!showForm)}
          />
          {showForm && (
            <SetTargetForm
              group={group}
              onDone={() => {
                setShowForm(false);
                void load();
              }}
            />
          )}
          {targets.length > 0 && (
            <Card>
              <SectionTitle>{t('all_targets')}</SectionTitle>
              {targets.map((x) => (
                <Row key={x.id} gap={8} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: c.border }}>
                  <Icon name={kindMeta(x.kind).icon} color={c.secondary} />
                  <Txt style={{ flex: 1 }}>
                    {fmt(x.value, x.kind)} {kindMeta(x.kind).unit} · {dateRange(x.start_date, x.end_date)}
                  </Txt>
                  <Txt size="small" muted>
                    {t(`status_${x.status}` as TKey)}
                  </Txt>
                  <Pressable
                    hitSlop={10}
                    accessibilityLabel={t('delete')}
                    onPress={() =>
                      Alert.alert(t('delete'), t('delete_target_confirm'), [
                        { text: t('cancel'), style: 'cancel' },
                        { text: t('delete'), style: 'destructive', onPress: () => void deleteGroupTarget(x.id).then(load) },
                      ])
                    }
                  >
                    <Icon name="delete-outline" color={c.danger} />
                  </Pressable>
                </Row>
              ))}
            </Card>
          )}
        </>
      )}
    </>
  );
}

/** Admin form: target type, value, duration, rewards. */
function SetTargetForm({ group, onDone }: { group: MyGroup; onDone: () => void }) {
  const { t, colors: c } = useSettings();
  const kinds = group.kind === 'open' ? KINDS.filter((k) => k.kind === 'steps' || k.kind === 'workout_minutes') : KINDS;
  const [kind, setKind] = useState<TargetKind>('steps');
  const [value, setValue] = useState('');
  const [when, setWhen] = useState<'this_week' | 'next_week' | 'this_month' | 'next_month'>('this_week');
  const [gold, setGold] = useState(true);
  const [silver, setSilver] = useState(true);
  const [points, setPoints] = useState(true);
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  const ranges = {
    this_week: [today, addDays(today, 6)],
    next_week: [addDays(today, 7), addDays(today, 13)],
    this_month: [today, monthEndKey(today)],
    next_month: (() => {
      const d = parseKey(monthStartKey(today));
      d.setMonth(d.getMonth() + 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      return [start, monthEndKey(start)];
    })(),
  } as const;

  const save = async () => {
    const v = parseFloat(value);
    if (!(v > 0)) {
      Alert.alert(t('please_fill'), t('target_value'));
      return;
    }
    setBusy(true);
    try {
      const [start, end] = ranges[when];
      await setGroupTarget(group.id, { kind, value: v, start, end, gold, silver, points });
      onDone();
    } catch (e) {
      const key = groupErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const check = (on: boolean, set: (b: boolean) => void, emoji: string, label: string, pts: string) => (
    <Pressable onPress={() => set(!on)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <Row gap={10} style={{ paddingVertical: 8 }}>
        <MaterialCommunityIcons name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={on ? BRAND.green : c.muted} />
        <Txt size="large">{emoji}</Txt>
        <Txt bold style={{ flex: 1 }}>
          {label}
        </Txt>
        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Txt bold size="small" color="#92400E">
            {pts}
          </Txt>
        </View>
      </Row>
    </Pressable>
  );

  return (
    <Card style={{ gap: 10 }}>
      <Txt bold size="large">
        {t('select_target_type')}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {kinds.map((k) => {
          const on = kind === k.kind;
          return (
            <Pressable
              key={k.kind}
              onPress={() => setKind(k.kind)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                width: '23%',
                minWidth: 76,
                flexGrow: 1,
                alignItems: 'center',
                padding: 10,
                borderRadius: 14,
                borderWidth: on ? 2.5 : 1,
                borderColor: on ? BRAND.green : c.border,
                backgroundColor: on ? c.primarySoft : c.card,
              }}
            >
              <Icon name={k.icon} size={30} color={on ? BRAND.green : c.secondary} />
              <Txt bold size="small" center>
                {t(k.label)}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {group.kind === 'open' && (
        <Txt muted size="small">
          {t('open_target_note')}
        </Txt>
      )}

      <Txt bold size="large">
        {t('target_details')}
      </Txt>
      <Row gap={8}>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder={kind === 'steps' ? '50000' : kind === 'weight_loss' ? '5' : '600'}
          placeholderTextColor={c.muted}
          style={{
            flex: 1,
            minHeight: 50,
            borderWidth: 1.5,
            borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontSize: font.large,
            color: c.text,
            backgroundColor: c.inputBg,
          }}
        />
        <View style={{ minWidth: 70, alignItems: 'center', justifyContent: 'center' }}>
          <Txt bold>{kindMeta(kind).unit}</Txt>
        </View>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(ranges) as (keyof typeof ranges)[]).map((k) => (
          <Pressable
            key={k}
            onPress={() => setWhen(k)}
            style={{
              paddingHorizontal: 12,
              minHeight: 44,
              justifyContent: 'center',
              borderRadius: 22,
              borderWidth: 1.5,
              borderColor: when === k ? BRAND.green : c.border,
              backgroundColor: when === k ? BRAND.green : c.card,
            }}
          >
            <Txt bold color={when === k ? '#FFFFFF' : c.text}>
              {t(k)} ({dateRange(ranges[k][0], ranges[k][1])})
            </Txt>
          </Pressable>
        ))}
      </View>

      <Txt bold size="large">
        {t('reward_on_achievement')}
      </Txt>
      {check(gold, setGold, '🥇', t('gold_coin'), t('pts_100'))}
      {check(silver, setSilver, '🥈', t('silver_coin'), t('pts_50'))}
      {check(points, setPoints, '⭐', t('group_points'), t('pts_10'))}

      <Button icon="check-circle" title={t('set_group_target')} loading={busy} onPress={save} />
    </Card>
  );
}

/** Rewards tab: how rewards work + points earned in this group. */
export function RewardsTab({ group, userId, refreshKey }: { group: MyGroup; userId: string; refreshKey: number }) {
  const { t, colors: c, isDark } = useSettings();
  const [points, setPoints] = useState<PointsRow[]>([]);
  const navy = isDark ? c.text : BRAND.navy;

  useEffect(() => {
    fetchPoints(group.id, todayKey())
      .then(setPoints)
      .catch(() => {});
  }, [group.id, refreshKey]);

  const me = points.find((p) => p.user_id === userId);
  const tile = (emoji: string, label: string, value: string, bg: string) => (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: bg, borderRadius: 16, padding: 10 }}>
      <Txt size="title">{emoji}</Txt>
      <Txt bold size="small" center color="#0F241B">
        {label}
      </Txt>
      <Txt bold size="large" color="#0F241B">
        {value}
      </Txt>
    </View>
  );

  return (
    <>
      <Card>
        <SectionTitle>
          <Icon name="gift-outline" color={BRAND.orange} /> {t('rewards_points')}
        </SectionTitle>
        {[
          ['🥇', t('gold_coin'), t('gold_rule')],
          ['🥈', t('silver_coin'), t('silver_rule')],
          ['⭐', t('points'), t('points_rule')],
        ].map(([e, l, r]) => (
          <Row key={l} gap={10} style={{ paddingVertical: 6 }}>
            <Txt size="title">{e}</Txt>
            <Txt bold style={{ width: 100 }}>
              {l}
            </Txt>
            <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Txt size="small" color="#92400E">
                {r}
              </Txt>
            </View>
          </Row>
        ))}
      </Card>

      <Card>
        <SectionTitle>
          <Icon name="account-star" color={navy} /> {t('my_rewards')}
        </SectionTitle>
        <Row gap={8}>
          {tile('🥇', t('gold_coins'), `${me?.gold ?? 0}`, '#FEF3C7')}
          {tile('🥈', t('silver_coins'), `${me?.silver ?? 0}`, '#E2E8F0')}
          {tile('⭐', t('total_points'), `${me?.total ?? 0}`, '#F3E8FF')}
        </Row>
      </Card>

      <Card>
        <SectionTitle>
          <Icon name="trophy" color={BRAND.orange} /> {t('points_leaderboard')}
        </SectionTitle>
        {points.length === 0 ? (
          <Txt muted>{t('no_points_yet')}</Txt>
        ) : (
          points.map((p, i) => (
            <Row key={p.user_id} gap={10} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border }}>
              <Txt bold style={{ width: 28 }}>
                {i + 1}.
              </Txt>
              <Txt bold style={{ flex: 1 }}>
                {p.name}
                {p.user_id === userId ? ` (${t('you')})` : ''}
              </Txt>
              <Txt size="small" muted>
                🥇{p.gold} 🥈{p.silver}
              </Txt>
              <Txt bold color={BRAND.green}>
                {p.total} {t('pts')}
              </Txt>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}
