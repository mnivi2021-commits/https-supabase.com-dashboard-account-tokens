import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import { Alert, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { captureRef } from 'react-native-view-shot';

import { Button, Card, Icon, ProgressBar, Row, Screen, SectionTitle, Segmented, Stat, Txt } from '@/components/ui';
import { SyncRefresh } from '@/components/SyncRefresh';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { lastNDays, monthDays, monthStartKey, todayKey, weekdayIndex } from '@/lib/dates';
import { workoutDetail } from '@/lib/format';
import { calcBmi, round1, workoutMeta } from '@/lib/health';
import { computeBadges, currentStreak, daySummary, type DaySummary } from '@/lib/metrics';
import { exportPdf } from '@/lib/report';
import { useSettings } from '@/theme/settings';

type Period = 'day' | 'week' | 'month';

export default function Reports() {
  const { t, colors: c } = useSettings();
  const data = useData();
  const [period, setPeriod] = useState<Period>('day');
  const [busy, setBusy] = useState<'pdf' | 'img' | null>(null);
  const shotRef = useRef<React.ComponentRef<typeof View>>(null);
  const streak = currentStreak(data.workouts);
  const heightCm = data.profile?.height_cm ?? 0;

  const days = useMemo(() => {
    const keys = period === 'day' ? [todayKey()] : period === 'week' ? lastNDays(7) : monthDays();
    return keys.map((k) => daySummary(data, k));
  }, [period, data]);

  // Weight change for the period: last log before/at the start → latest log in the period.
  const weight = useMemo(() => {
    if (period === 'day') return null;
    const start = days[0].date;
    const before = [...data.weights].filter((w) => w.date <= start).pop();
    const inPeriod = data.weights.filter((w) => w.date >= start);
    const first = before ?? inPeriod[0];
    const last = inPeriod[inPeriod.length - 1] ?? first;
    if (!first || !last) return null;
    return {
      start: first.weight_kg,
      end: last.weight_kg,
      bmiStart: calcBmi(first.weight_kg, heightCm),
      bmiEnd: calcBmi(last.weight_kg, heightCm),
    };
  }, [period, days, data.weights, heightCm]);

  const titleKey: Record<Period, TKey> = { day: 'day_report', week: 'week_report', month: 'month_report' };
  const reportInput = {
    title: t(titleKey[period]),
    name: data.profile?.name ?? '',
    period: period === 'day' ? days[0].date : `${days[0].date} → ${days[days.length - 1].date}`,
    days,
    weight,
    streak,
  };

  const onPdf = async () => {
    setBusy('pdf');
    try {
      await exportPdf(reportInput, t);
    } catch (e) {
      Alert.alert(t('error'), String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const onImage = async () => {
    setBusy('img');
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.95 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: reportInput.title });
    } catch (e) {
      Alert.alert(t('error'), String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshControl={<SyncRefresh />}>
      <Segmented
        options={[
          { value: 'day', label: t('day') },
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <View ref={shotRef} collapsable={false} style={{ gap: 14, backgroundColor: c.bg }}>
        {period === 'day' ? <DayView day={days[0]} /> : <RangeView days={days} period={period} weight={weight} />}
      </View>

      <Row gap={10}>
        <Button style={{ flex: 1 }} variant="secondary" icon="file-pdf-box" title={t('export_pdf')} loading={busy === 'pdf'} onPress={onPdf} />
        <Button style={{ flex: 1 }} variant="outline" icon="share-variant" title={t('share_image')} loading={busy === 'img'} onPress={onImage} />
      </Row>

      <Card>
        <SectionTitle right={<Txt bold>🔥 {streak}</Txt>}>{t('badges')}</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {computeBadges(data).map((b) => (
            <View
              key={b.id}
              style={{
                width: '30.5%',
                alignItems: 'center',
                padding: 10,
                borderRadius: 14,
                backgroundColor: b.earned ? c.primarySoft : c.cardAlt,
                opacity: b.earned ? 1 : 0.45,
              }}
            >
              <Txt size="title">{b.emoji}</Txt>
              <Txt size="small" center bold={b.earned}>
                {t(b.label)}
              </Txt>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

function DayView({ day }: { day: DaySummary }) {
  const { t, colors: c } = useSettings();
  const { targets } = useData();
  const rows: { label: string; pct: number; value: string; color: string }[] = [
    { label: t('steps'), pct: day.pct.steps, value: `${day.steps.toLocaleString()} / ${targets.steps.toLocaleString()}`, color: '#16A34A' },
    { label: t('workout'), pct: day.pct.minutes, value: `${day.minutes} / ${targets.workout_minutes} ${t('min')}`, color: '#F97316' },
    { label: t('sleep'), pct: day.pct.sleep, value: `${day.sleepHours} / ${targets.sleep_hours} ${t('hrs')}`, color: '#9333EA' },
    { label: t('water'), pct: day.pct.water, value: `${day.water} / ${targets.water_ml} ml`, color: '#0284C7' },
  ];
  return (
    <>
      <Card style={{ alignItems: 'center' }}>
        <Txt muted>{t('target_done')}</Txt>
        <Txt size="hero" bold color={c.primary}>
          {day.targetPct}%
        </Txt>
      </Card>
      <Card>
        {rows.map((r) => (
          <View key={r.label} style={{ marginBottom: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <Txt bold>{r.label}</Txt>
              <Txt muted>{r.value}</Txt>
            </Row>
            <ProgressBar value={r.pct} color={r.color} />
          </View>
        ))}
      </Card>
      <Card>
        <SectionTitle right={<Txt bold color="#F97316">{day.calories} kcal</Txt>}>{t('workouts')}</SectionTitle>
        {day.workouts.length === 0 && <Txt muted>{t('no_workouts_today')}</Txt>}
        {day.workouts.map((w) => {
          const m = workoutMeta(w.type);
          return (
            <Row key={w.id} gap={10} style={{ marginBottom: 8 }}>
              <Icon name={m.icon} color={m.color} />
              <View style={{ flex: 1 }}>
                <Txt bold>{t(`w_${w.type}`)}</Txt>
                <Txt muted size="small">
                  {workoutDetail(w, t)}
                </Txt>
              </View>
            </Row>
          );
        })}
        {day.sleepQuality && (
          <Txt style={{ marginTop: 6 }}>
            {t('sleep')}: {day.sleepHours} {t('hrs')} · {t(`q_${day.sleepQuality}`)}
          </Txt>
        )}
      </Card>
    </>
  );
}

function RangeView({
  days,
  period,
  weight,
}: {
  days: DaySummary[];
  period: 'week' | 'month';
  weight: { start: number; end: number; bmiStart: number; bmiEnd: number } | null;
}) {
  const { t, colors: c } = useSettings();
  const { weights, targets, profile } = useData();
  const { width } = useWindowDimensions();
  const chartWidth = width - 110;
  const n = days.length;
  const barWidth = period === 'week' ? 24 : Math.max(4, Math.floor(chartWidth / n) - 4);
  const spacing = period === 'week' ? 14 : 4;

  const label = (d: DaySummary, i: number) =>
    period === 'week' ? t(`wd_${weekdayIndex(d.date)}` as TKey) : i % 5 === 0 ? String(Number(d.date.slice(8))) : '';

  const totalMin = days.reduce((s, d) => s + d.minutes, 0);
  const totalKcal = days.reduce((s, d) => s + d.calories, 0);
  const totalSteps = days.reduce((s, d) => s + d.steps, 0);
  const slept = days.filter((d) => d.sleepHours > 0);
  const avgSleep = slept.length ? round1(slept.reduce((s, d) => s + d.sleepHours, 0) / slept.length) : 0;
  const best = [...days].sort((a, b) => b.minutes - a.minutes || b.calories - a.calories)[0];

  const axis = {
    yAxisThickness: 0,
    xAxisColor: c.border,
    rulesColor: c.border,
    yAxisTextStyle: { color: c.muted, fontSize: 11 },
    xAxisLabelTextStyle: { color: c.muted, fontSize: 11 },
    noOfSections: 4,
    width: chartWidth,
    barWidth,
    spacing,
    roundedTop: true,
    isAnimated: true,
  };

  const monthStart = monthStartKey();
  const monthWeights = weights.filter((w) => (period === 'month' ? w.date >= monthStart : w.date >= days[0].date));
  const bmiHistory = weights.slice(-12);
  const change = weight ? round1(weight.end - weight.start) : 0;

  return (
    <>
      <Card>
        <Row>
          <Stat icon="timer-outline" label={t('active_minutes')} value={`${totalMin}`} />
          <Stat icon="fire" color="#F97316" label="kcal" value={`${totalKcal}`} />
          <Stat icon="shoe-print" color="#16A34A" label={t('steps')} value={totalSteps.toLocaleString()} />
          <Stat icon="sleep" color="#9333EA" label={t('avg_sleep')} value={`${avgSleep}`} />
        </Row>
        {best && best.minutes > 0 && (
          <Txt center style={{ marginTop: 8 }}>
            ⭐ {t('best_day')}: {best.date} · {best.minutes} {t('min')} · {best.calories} kcal
          </Txt>
        )}
      </Card>

      <Card>
        <SectionTitle>{t('active_minutes')}</SectionTitle>
        <BarChart
          {...axis}
          data={days.map((d, i) => ({
            value: d.minutes,
            label: label(d, i),
            frontColor: d.minutes >= targets.workout_minutes ? '#F97316' : '#FDBA74',
          }))}
        />
      </Card>

      <Card>
        <SectionTitle>{t('steps')}</SectionTitle>
        <BarChart
          {...axis}
          data={days.map((d, i) => ({
            value: d.steps,
            label: label(d, i),
            frontColor: d.steps >= targets.steps ? '#16A34A' : '#86EFAC',
          }))}
        />
      </Card>

      {period === 'week' && (
        <Card>
          <SectionTitle>{t('sleep')}</SectionTitle>
          <BarChart
            {...axis}
            data={days.map((d, i) => ({ value: d.sleepHours, label: label(d, i), frontColor: '#9333EA' }))}
          />
        </Card>
      )}

      {period === 'month' && (
        <>
          <Card>
            <SectionTitle>{t('weight_change')}</SectionTitle>
            {weight ? (
              <>
                <Row>
                  <Stat label={t('start')} value={`${weight.start} kg`} />
                  <Stat label={t('now')} value={`${weight.end} kg`} />
                  <Stat
                    label={t('change')}
                    color={c.primary}
                    value={`${change > 0 ? '+' : ''}${change} kg`}
                  />
                </Row>
                <Txt center muted>
                  BMI {weight.bmiStart} → {weight.bmiEnd}
                </Txt>
                {profile && profile.goal_type !== 'maintain' && (
                  <View style={{ marginTop: 10 }}>
                    <Txt muted size="small">
                      {t('monthly_goal')}: {profile.goal_type === 'lose' ? '-' : '+'}
                      {targets.monthly_weight_change_kg} kg
                    </Txt>
                    <ProgressBar
                      value={
                        (Math.max(0, profile.goal_type === 'lose' ? -change : change) /
                          Math.max(0.1, targets.monthly_weight_change_kg)) *
                        100
                      }
                    />
                  </View>
                )}
              </>
            ) : (
              <Txt muted>{t('no_weight_logs')}</Txt>
            )}
            {monthWeights.length > 1 && (
              <View style={{ marginTop: 12 }}>
                <LineChart
                  data={monthWeights.map((w) => ({ value: w.weight_kg, label: w.date.slice(8) }))}
                  width={chartWidth}
                  color={c.secondary}
                  dataPointsColor={c.secondary}
                  thickness={3}
                  yAxisOffset={Math.floor(Math.min(...monthWeights.map((w) => w.weight_kg)) - 3)}
                  yAxisThickness={0}
                  xAxisColor={c.border}
                  rulesColor={c.border}
                  yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
                  xAxisLabelTextStyle={{ color: c.muted, fontSize: 11 }}
                  spacing={Math.max(30, chartWidth / monthWeights.length)}
                  curved
                />
              </View>
            )}
          </Card>

          {bmiHistory.length > 1 && (
            <Card>
              <SectionTitle>{t('bmi_history')}</SectionTitle>
              <LineChart
                data={bmiHistory.map((w) => ({ value: w.bmi, label: w.date.slice(5) }))}
                width={chartWidth}
                color={c.primary}
                dataPointsColor={c.primary}
                thickness={3}
                yAxisOffset={Math.floor(Math.min(...bmiHistory.map((w) => w.bmi)) - 2)}
                yAxisThickness={0}
                xAxisColor={c.border}
                rulesColor={c.border}
                yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: c.muted, fontSize: 10 }}
                spacing={Math.max(44, chartWidth / bmiHistory.length)}
              />
              <Txt muted size="small" style={{ marginTop: 6 }}>
                {t('bmi_asian_note')}
              </Txt>
            </Card>
          )}
        </>
      )}
    </>
  );
}
