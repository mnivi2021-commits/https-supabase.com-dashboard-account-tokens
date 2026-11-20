import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Icon, Row, Screen, Stat, Txt } from '@/components/ui';
import { useStepsStatus } from '@/data/steps';
import { useData } from '@/data/store';
import { todayKey } from '@/lib/dates';
import { estimateCalories, stepsToKm } from '@/lib/health';
import { useSettings } from '@/theme/settings';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** Live walking session: timer + pedometer steps, saved as a walking workout. */
export default function Walk() {
  useKeepAwake();
  const { t, colors: c } = useSettings();
  const { profile, addWorkout } = useData();
  const { available, permitted } = useStepsStatus();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [steps, setSteps] = useState(0);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now() - seconds * 1000;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    const base = steps;
    const sub = available && permitted ? Pedometer.watchStepCount((r) => setSteps(base + r.steps)) : null;
    return () => {
      clearInterval(timer);
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const km = profile ? stepsToKm(steps, profile.height_cm, profile.gender) : 0;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const kcal = estimateCalories({ type: 'walking', minutes, reps: null, sets: null }, profile?.weight_kg ?? 60);

  const finish = () => {
    setRunning(false);
    if (seconds >= 30) {
      addWorkout({
        type: 'walking',
        date: todayKey(),
        minutes,
        distance_km: km || null,
        steps: steps || null,
        reps: null,
        sets: null,
      });
    }
    router.back();
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Icon name="walk" size={56} color={c.primary} />
        <Txt size="hero" bold style={{ fontSize: 56, lineHeight: 66 }}>
          {fmt(seconds)}
        </Txt>
        <Txt muted>{running ? t('walking_now') : seconds ? t('paused') : t('ready_to_walk')}</Txt>
      </Card>

      <Card>
        <Row>
          <Stat icon="shoe-print" color={c.primary} label={t('steps')} value={steps.toLocaleString()} />
          <Stat icon="map-marker-distance" label="km" value={km.toFixed(2)} />
          <Stat icon="fire" color="#F97316" label="kcal" value={`${seconds ? kcal : 0}`} />
        </Row>
      </Card>

      {available === false || !permitted ? (
        <Txt muted center>
          {t('pedometer_unavailable')}
        </Txt>
      ) : null}

      <View style={{ gap: 12 }}>
        {running ? (
          <Button variant="outline" icon="pause-circle" title={t('pause')} onPress={() => setRunning(false)} />
        ) : (
          <Button icon="play-circle" title={seconds ? t('resume') : t('start')} onPress={() => setRunning(true)} />
        )}
        <Button variant="danger" icon="stop-circle" title={t('finish_save')} disabled={!seconds} onPress={finish} />
      </View>
    </Screen>
  );
}
