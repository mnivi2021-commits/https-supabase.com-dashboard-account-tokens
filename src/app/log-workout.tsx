import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Button, Card, Chip, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import { addDays, todayKey } from '@/lib/dates';
import { estimateCalories, workoutMeta } from '@/lib/health';
import { WORKOUT_TYPES, type WorkoutType } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60];
const QUICK_REPS = [5, 10, 15, 20, 25];

export default function LogWorkout() {
  const { t, colors: c } = useSettings();
  const params = useLocalSearchParams<{ type?: string }>();
  const type: WorkoutType = WORKOUT_TYPES.includes(params.type as WorkoutType) ? (params.type as WorkoutType) : 'walking';
  const meta = workoutMeta(type);
  const { profile, addWorkout, steps: dailySteps } = useData();

  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('3');
  const [stepsText, setStepsText] = useState('');
  const [day, setDay] = useState<'today' | 'yesterday'>('today');

  const entry = {
    type,
    minutes: meta.kind === 'time' ? parseFloat(minutes) || null : null,
    reps: meta.kind === 'count' ? parseInt(reps, 10) || null : null,
    sets: meta.kind === 'count' ? parseInt(sets, 10) || 1 : null,
  };
  const kcal = estimateCalories(entry, profile?.weight_kg ?? 60);
  const valid = meta.kind === 'time' ? !!entry.minutes && entry.minutes > 0 : !!entry.reps && entry.reps > 0;
  const pedometerToday = dailySteps[todayKey()] ?? 0;

  const save = () => {
    addWorkout({
      ...entry,
      date: day === 'today' ? todayKey() : addDays(todayKey(), -1),
      distance_km: meta.hasDistance ? parseFloat(distance) || null : null,
      steps: type === 'walking' ? parseInt(stepsText, 10) || null : null,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row gap={12}>
          <Icon name={meta.icon} size={44} color={meta.color} />
          <Txt size="title" bold>
            {t(`w_${type}`)}
          </Txt>
        </Row>

        <Row gap={8}>
          <Chip label={t('today')} selected={day === 'today'} onPress={() => setDay('today')} />
          <Chip label={t('yesterday')} selected={day === 'yesterday'} onPress={() => setDay('yesterday')} />
        </Row>

        <Card>
          {meta.kind === 'time' ? (
            <>
              <Field label={t('minutes')} keyboardType="numeric" value={minutes} onChangeText={setMinutes} placeholder="30" />
              <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                {QUICK_MINUTES.map((m) => (
                  <Chip key={m} label={`${m}`} selected={minutes === String(m)} onPress={() => setMinutes(String(m))} />
                ))}
              </Row>
              {meta.hasDistance && (
                <Field
                  label={t('distance_optional')}
                  keyboardType="decimal-pad"
                  value={distance}
                  onChangeText={setDistance}
                  placeholder="2.5"
                />
              )}
              {type === 'walking' && (
                <>
                  <Field
                    label={t('steps_optional')}
                    keyboardType="number-pad"
                    value={stepsText}
                    onChangeText={setStepsText}
                    placeholder="3000"
                  />
                  {pedometerToday > 0 && (
                    <Button
                      small
                      variant="ghost"
                      icon="shoe-print"
                      title={t('use_pedometer', { n: pedometerToday.toLocaleString() })}
                      onPress={() => setStepsText(String(pedometerToday))}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Field label={t('reps')} keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="10" />
              <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                {QUICK_REPS.map((m) => (
                  <Chip key={m} label={`${m}`} selected={reps === String(m)} onPress={() => setReps(String(m))} />
                ))}
              </Row>
              <Field label={t('sets')} keyboardType="number-pad" value={sets} onChangeText={setSets} placeholder="3" />
              {!!entry.reps && (
                <Txt muted>
                  {t('total_reps', { n: (entry.reps ?? 0) * (entry.sets ?? 1) })}
                </Txt>
              )}
            </>
          )}
        </Card>

        <Card style={{ alignItems: 'center', backgroundColor: c.primarySoft, borderColor: c.primary }}>
          <Txt muted>{t('calories_estimate')}</Txt>
          <Txt size="hero" bold color={c.primary}>
            {kcal} kcal
          </Txt>
          <Txt muted size="small" center>
            {t('met_note', { met: meta.met, kg: profile?.weight_kg ?? 60 })}
          </Txt>
        </Card>

        <Button title={t('save')} icon="check-circle" disabled={!valid} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
