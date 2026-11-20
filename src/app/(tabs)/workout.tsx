import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Button, Card, Icon, ListItem, Screen, SectionTitle, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import { formatHourMinute, todayKey } from '@/lib/dates';
import { workoutDetail } from '@/lib/format';
import { WORKOUTS, workoutMeta } from '@/lib/health';
import type { Workout } from '@/lib/types';
import { useSettings } from '@/theme/settings';

export default function WorkoutTab() {
  const { t, colors: c } = useSettings();
  const { workouts, deleteWorkout, reminders } = useData();
  const today = todayKey();
  const todays = workouts.filter((w) => w.date === today).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const workoutReminders = reminders.filter((r) => r.kind === 'workout' && r.enabled);

  const confirmDelete = (w: Workout) =>
    Alert.alert(t('delete_entry'), t(`w_${w.type}`), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteWorkout(w.id) },
    ]);

  return (
    <Screen>
      <Txt muted>{t('choose_workout')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {WORKOUTS.map((m) => (
          <Pressable
            key={m.type}
            accessibilityRole="button"
            accessibilityLabel={t(`w_${m.type}`)}
            onPress={() => router.push({ pathname: '/log-workout', params: { type: m.type } })}
            style={({ pressed }) => ({
              width: '47.5%',
              minHeight: 118,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.card,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View style={{ backgroundColor: m.color + '22', borderRadius: 18, padding: 10 }}>
              <Icon name={m.icon} size={36} color={m.color} />
            </View>
            <Txt bold>{t(`w_${m.type}`)}</Txt>
            <Txt muted size="small">
              {m.kind === 'time' ? t('time_based') : t('reps_sets')}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Button variant="secondary" icon="walk" title={t('start_live_walk')} onPress={() => router.push('/walk')} />

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
