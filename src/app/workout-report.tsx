import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { AppHeader } from '@/components/AppHeader';
import { SyncRefresh } from '@/components/SyncRefresh';
import { Card, Icon, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { BRAND } from '@/components/WelcomeArt';
import { StatTile, TitleTile } from '@/components/WorkoutUi';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { weekdayIndex } from '@/lib/dates';
import { workoutMeta } from '@/lib/health';
import { change, formatMinutes, periodDays, workoutTotals, type Period } from '@/lib/workoutStats';
import { useSettings } from '@/theme/settings';

const SHOW_ROWS = 5;

/** "Workout Report" (design): summary tiles, activity chart, per-workout table, insights. */
export default function WorkoutReport() {
  const { t, colors: c, isDark } = useSettings();
  const data = useData();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>('week');
  const [showAll, setShowAll] = useState(false);

  const { days, prev } = periodDays(period);
  const now = useMemo(() => workoutTotals(data, days), [data, days.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const before = useMemo(() => workoutTotals(data, prev), [data, prev.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const goal = data.targets.workout_minutes * days.length;
  const achieved = now.minutes >= goal && goal > 0;
  const navy = isDark ? c.text : BRAND.navy;

  const summaryTitle: Record<Period, TKey> = { day: 'today_summary', week: 'week_summary', month: 'month_summary' };
  const vsKey: Record<Period, TKey> = { day: 'vs_yesterday', week: 'vs_last_week', month: 'vs_last_month' };

  // Chart: per type for a single day, per day otherwise.
  const chartWidth = width - 100;
  const bars =
    period === 'day'
      ? now.byType.map((b) => ({
          value: b.minutes,
          frontColor: workoutMeta(b.type).color,
          labelComponent: () => (
            <View style={{ alignItems: 'center', width: 44, marginLeft: -6 }}>
              <Icon name={workoutMeta(b.type).icon} size={18} color={workoutMeta(b.type).color} />
              <Txt size="small" bold>
                {b.minutes}
              </Txt>
            </View>
          ),
        }))
      : now.perDay.map((d, i) => ({
          value: d.minutes,
          frontColor: d.minutes >= data.targets.workout_minutes ? BRAND.greenLight : '#A7E3AE',
          labelComponent:
            period === 'week'
              ? () => (
                  <View style={{ alignItems: 'center', width: 40, marginLeft: -4 }}>
                    <Txt size="small" muted>
                      {t(`wd_${weekdayIndex(d.date)}` as TKey)}
                    </Txt>
                    <Txt size="small" bold>
                      {d.minutes}
                    </Txt>
                  </View>
                )
              : () => (
                  <Txt size="small" muted style={{ width: 24 }}>
                    {i % 5 === 0 ? String(Number(d.date.slice(8))) : ''}
                  </Txt>
                ),
        }));
  const n = Math.max(1, bars.length);
  const barWidth = period === 'month' ? Math.max(4, Math.floor(chartWidth / n) - 3) : period === 'week' ? 24 : 28;
  const spacing = period === 'month' ? 3 : period === 'week' ? 14 : 20;

  const rows = showAll ? now.byType : now.byType.slice(0, SHOW_ROWS);
  const hidden = now.byType.length - SHOW_ROWS;

  const insight = (label: string, pct: number | null) => (
    <Row gap={8} style={{ paddingVertical: 6 }}>
      <MaterialCommunityIcons name="check-circle" size={22} color={BRAND.green} />
      <Txt style={{ flex: 1 }}>
        {label}{' '}
        {pct == null ? (
          <Txt muted>—</Txt>
        ) : (
          <Txt bold color={pct >= 0 ? BRAND.green : c.danger}>
            {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
          </Txt>
        )}
      </Txt>
    </Row>
  );

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} refreshControl={<SyncRefresh />}>
      <AppHeader />
      <TitleTile icon="chart-bar" title={t('workout_report')} subtitle={t('workout_report_sub')} />

      <Segmented
        options={[
          { value: 'day', label: t('day') },
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
        ]}
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setShowAll(false);
        }}
      />

      <Card>
        <SectionTitle>
          <Icon name="calendar-check" color={navy} /> {t(summaryTitle[period])}
        </SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <StatTile tint="green" icon="run" label={t('workouts')} value={`${now.workouts}`} />
          <StatTile tint="orange" icon="fire" label={t('calories')} value={`${now.calories}`} unit="kcal" />
          <StatTile tint="blue" icon="timer-outline" label={t('time')} value={formatMinutes(now.minutes, t)} />
          <StatTile tint="purple" icon="map-marker" label={t('distance')} value={`${now.distanceKm}`} unit="km" />
        </View>
      </Card>

      <Card>
        <SectionTitle>
          <Icon name="calendar-month-outline" color={navy} /> {t('workout_activity')} ({t('min')})
        </SectionTitle>
        {now.minutes === 0 ? (
          <Txt muted>{t('no_workouts_period')}</Txt>
        ) : (
          <BarChart
            data={bars}
            width={chartWidth}
            barWidth={barWidth}
            spacing={spacing}
            roundedTop
            noOfSections={4}
            yAxisThickness={0}
            xAxisColor={c.border}
            rulesColor={c.border}
            yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
            labelsExtraHeight={period === 'month' ? 0 : 24}
            isAnimated
          />
        )}
      </Card>

      <Card>
        <SectionTitle>
          <Icon name="run" color={navy} /> {t('workout_wise_summary')}
        </SectionTitle>
        {now.byType.length === 0 ? (
          <Txt muted>{t('no_workouts_period')}</Txt>
        ) : (
          <>
            <Row style={{ backgroundColor: c.primarySoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 8 }}>
              <Txt bold size="small" style={{ flex: 2.2 }}>
                {t('workout')}
              </Txt>
              <Txt bold size="small" style={{ flex: 1.6 }}>
                {t('total_time')}
              </Txt>
              <Txt bold size="small" style={{ flex: 1.4 }}>
                {t('calories')}
              </Txt>
              <Txt bold size="small" style={{ flex: 0.9, textAlign: 'right' }}>
                {t('count')}
              </Txt>
            </Row>
            {rows.map((b) => {
              const m = workoutMeta(b.type);
              return (
                <Row key={b.type} style={{ paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: c.border }}>
                  <Row gap={6} style={{ flex: 2.2 }}>
                    <Icon name={m.icon} size={20} color={m.color} />
                    <Txt size="small" bold numberOfLines={1} style={{ flex: 1 }}>
                      {t(`w_${b.type}`)}
                    </Txt>
                  </Row>
                  <Txt size="small" style={{ flex: 1.6 }}>
                    {formatMinutes(b.minutes, t)}
                  </Txt>
                  <Txt size="small" style={{ flex: 1.4 }}>
                    {b.calories} kcal
                  </Txt>
                  <Txt size="small" style={{ flex: 0.9, textAlign: 'right' }}>
                    {b.count}
                  </Txt>
                </Row>
              );
            })}
            {hidden > 0 && (
              <Pressable onPress={() => setShowAll(!showAll)} style={{ alignItems: 'center', paddingTop: 10 }} hitSlop={8}>
                <Txt bold color={c.secondary}>
                  {showAll ? `− ${t('show_less')}` : `+ ${t('show_more_workouts', { n: hidden })}`}
                </Txt>
              </Pressable>
            )}
          </>
        )}
      </Card>

      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
        <SectionTitle>
          <Icon name="target-account" color={navy} /> {t('insights_progress')}
        </SectionTitle>
        <View style={{ flexDirection: width < 380 ? 'column' : 'row', gap: 12 }}>
          <View style={{ flex: 1.4 }}>
            {insight(`${t('workout_time')} (${t(vsKey[period])})`, change(now.minutes, before.minutes))}
            {insight(`${t('calories_burned')} (${t(vsKey[period])})`, change(now.calories, before.calories))}
            <Row gap={8} style={{ paddingVertical: 6 }}>
              <MaterialCommunityIcons name="check-circle" size={22} color={BRAND.green} />
              <Txt style={{ flex: 1 }}>
                {t('consistency')}:{' '}
                <Txt bold>{t('n_of_days', { n: now.activeDays, total: days.length })}</Txt>{' '}
                {now.activeDays >= Math.ceil(days.length * 0.7) ? `(${t('good')})` : ''}
              </Txt>
            </Row>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: c.card,
              borderRadius: 18,
              padding: 12,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Txt size="hero">{achieved ? '🏆' : '🎯'}</Txt>
            <Txt bold center>
              {achieved ? t('goal_achieved') : t('goal_progress', { pct: Math.round((now.minutes / Math.max(1, goal)) * 100) })}
            </Txt>
            <Txt muted size="small" center>
              {t('goal_of', { min: formatMinutes(goal, t) })}
            </Txt>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
