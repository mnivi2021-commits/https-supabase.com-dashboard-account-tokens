import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { SyncRefresh } from '@/components/SyncRefresh';
import { Button, Card, Icon, ListItem, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { BigRing, StatTile, TitleTile } from '@/components/WorkoutUi';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { formatHourMinute, todayKey } from '@/lib/dates';
import { workoutDetail } from '@/lib/format';
import { WORKOUTS, workoutMeta } from '@/lib/health';
import type { Workout, WorkoutType } from '@/lib/types';
import { formatMinutes, periodDays, workoutTotals, type Period } from '@/lib/workoutStats';
import { useSettings } from '@/theme/settings';

/** "Workout Track" (design): period summary, workout tiles, Start Workout. */
export default function WorkoutTab() {
  const { t, colors: c, isDark } = useSettings();
  const data = useData();
  const { workouts, deleteWorkout, reminders, targets } = data;
  const [period, setPeriod] = useState<Period>('day');
  const [selected, setSelected] = useState<WorkoutType>('walking');
  const today = todayKey();

  const { days } = periodDays(period, today);
  const totals = useMemo(() => workoutTotals(data, days), [data, days.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const goalMinutes = targets.workout_minutes * days.length;
  const pct = Math.round((totals.minutes / Math.max(1, goalMinutes)) * 100);
  const doneToday = new Set(workouts.filter((w) => w.date === today).map((w) => w.type));
  const todays = workouts.filter((w) => w.date === today).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const workoutReminders = reminders.filter((r) => r.kind === 'workout' && r.enabled);

  const confirmDelete = (w: Workout) =>
    Alert.alert(t('delete_entry'), t(`w_${w.type}`), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteWorkout(w.id) },
    ]);

  const titleKey: Record<Period, TKey> = { day: 'todays_workout', week: 'this_week', month: 'this_month' };

  return (
    <Screen edges={['top', 'left', 'right']} refreshControl={<SyncRefresh />}>
      <AppHeader onBack={null} />
      <TitleTile icon="dumbbell" title={t('workout_track')} subtitle={t('workout_track_sub')} />

      <Segmented
        options={[
          { value: 'day', label: t('day') },
          { value: 'week', label: t('week') },
          { value: 'month', label: t('month') },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <Card>
        <SectionTitle>
          <Icon name="calendar-check" color={isDark ? c.text : BRAND.navy} /> {t(titleKey[period])}
        </SectionTitle>
        <Row gap={12} style={{ alignItems: 'center' }}>
          <BigRing pct={pct} caption={t('n_workouts', { n: totals.workouts })} size={128} />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatTile tint="orange" icon="fire" label={t('calories_burned')} value={`${totals.calories}`} unit="kcal" />
            <StatTile tint="blue" icon="timer-outline" label={t('workout_time')} value={`${totals.minutes}`} unit={t('min')} />
            <StatTile tint="green" icon="shoe-print" label={t('steps')} value={totals.steps.toLocaleString()} />
            <StatTile tint="purple" icon="map-marker" label={t('distance')} value={`${totals.distanceKm}`} unit="km" />
          </View>
        </Row>
        <Txt muted size="small" style={{ marginTop: 8 }}>
          {t('ring_note', { min: formatMinutes(goalMinutes, t) })}
        </Txt>
      </Card>

      <Card>
        <SectionTitle>
          <Icon name="run" color={isDark ? c.text : BRAND.navy} /> {t('select_track_workout')}
        </SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WORKOUTS.map((m) => {
            const on = selected === m.type;
            const done = doneToday.has(m.type);
            return (
              <Pressable
                key={m.type}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(`w_${m.type}`)}
                onPress={() => setSelected(m.type)}
                onLongPress={() => router.push({ pathname: '/log-workout', params: { type: m.type } })}
                style={({ pressed }) => ({
                  width: '23.5%',
                  minWidth: 74,
                  flexGrow: 1,
                  minHeight: 96,
                  borderRadius: 16,
                  borderWidth: on ? 2.5 : 1,
                  borderColor: on ? m.color : c.border,
                  backgroundColor: isDark ? c.cardAlt : m.color + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View style={{ position: 'absolute', top: 6, right: 6 }}>
                  {done ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={BRAND.green} />
                  ) : (
                    <MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={on ? m.color : c.muted} />
                  )}
                </View>
                <Icon name={m.icon} size={34} color={m.color} />
                <Txt bold size="small" center numberOfLines={2}>
                  {t(`w_${m.type}`)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt muted size="small" style={{ marginTop: 8 }}>
          ✅ = {t('done_today')}
        </Txt>
      </Card>

      <GradientButton
        title={`${t('start_workout')} · ${t(`w_${selected}`)}`}
        icon="play-circle"
        colors={[BRAND.greenLight, BRAND.green]}
        onPress={() => router.push({ pathname: '/log-workout', params: { type: selected } })}
      />
      <Row gap={10}>
        <Button style={{ flex: 1 }} variant="secondary" icon="walk" title={t('live_walk')} onPress={() => router.push('/walk')} />
        <Button style={{ flex: 1 }} variant="outline" icon="chart-bar" title={t('workout_report')} onPress={() => router.push('/workout-report')} />
      </Row>

      <Card>
        <SectionTitle>{t('todays_workouts')}</SectionTitle>
        {todays.length === 0 ? (
          <Txt muted>{t('no_workouts_today')}</Txt>
        ) : (
          todays.map((w) => {
            const m = workoutMeta(w.type);
            return (
              <ListItem
                key={w.id}
                icon={m.icon}
                color={m.color}
                title={t(`w_${w.type}`)}
                subtitle={workoutDetail(w, t)}
                right={
                  <Pressable onPress={() => confirmDelete(w)} accessibilityLabel={t('delete')} hitSlop={12}>
                    <Icon name="delete-outline" color={c.danger} />
                  </Pressable>
                }
              />
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle>{t('workout_reminders')} ⏰</SectionTitle>
        <Txt muted style={{ marginBottom: 10 }}>
          {workoutReminders.length
            ? workoutReminders.map((r) => formatHourMinute(r.hour, r.minute)).join('  ·  ')
            : t('no_reminders')}
        </Txt>
        <Button variant="outline" icon="bell-ring" title={t('set_reminders')} onPress={() => router.push('/reminders')} />
      </Card>
    </Screen>
  );
}
