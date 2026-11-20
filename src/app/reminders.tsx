import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { TimeField } from '@/components/pickers';
import { Button, Card, Chip, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { newId, useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import type { Reminder } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const timeOf = (r: Reminder | undefined, h: number, m: number) => {
  const d = new Date();
  d.setHours(r?.hour ?? h, r?.minute ?? m, 0, 0);
  return d;
};

export default function Reminders() {
  const { t, colors: c } = useSettings();
  const { reminders, saveReminders } = useData();

  const workout = reminders.filter((r) => r.kind === 'workout' && r.enabled);
  const bed = reminders.find((r) => r.kind === 'bedtime');
  const weight = reminders.find((r) => r.kind === 'weight');

  const [count, setCount] = useState<'0' | '1' | '2'>(String(Math.min(2, workout.length)) as '0' | '1' | '2');
  const [w1, setW1] = useState(timeOf(workout[0], 6, 0));
  const [w2, setW2] = useState(timeOf(workout[1], 18, 0));
  const [bedOn, setBedOn] = useState(bed?.enabled ?? false);
  const [bedTime, setBedTime] = useState(timeOf(bed, 22, 0));
  const [weightOn, setWeightOn] = useState(weight?.enabled ?? true);
  const [weightDay, setWeightDay] = useState(weight?.weekday ?? 1);
  const [weightTime, setWeightTime] = useState(timeOf(weight, 8, 0));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const anyOn = count !== '0' || bedOn || weightOn;
      if (anyOn && !(await ensureNotificationPermission())) {
        Alert.alert(t('permission_needed'), t('permission_notif'));
      }
      const mk = (kind: Reminder['kind'], d: Date, enabled: boolean, weekday: number | null = null, id?: string): Reminder => ({
        id: id ?? newId(),
        kind,
        hour: d.getHours(),
        minute: d.getMinutes(),
        weekday,
        enabled,
      });
      const next: Reminder[] = [];
      if (count !== '0') next.push(mk('workout', w1, true, null, workout[0]?.id));
      if (count === '2') next.push(mk('workout', w2, true, null, workout[1]?.id));
      next.push(mk('bedtime', bedTime, bedOn, null, bed?.id));
      next.push(mk('weight', weightTime, weightOn, weightDay, weight?.id));
      await saveReminders(next);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>{t('workout_reminders')} 🏃</SectionTitle>
        <Txt muted style={{ marginBottom: 10 }}>
          {t('reminders_per_day')}
        </Txt>
        <Segmented
          options={[
            { value: '0', label: t('off') },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
          ]}
          value={count}
          onChange={setCount}
        />
        <View style={{ gap: 12, marginTop: 12 }}>
          {count !== '0' && <TimeField label={t('reminder_n', { n: 1 })} value={w1} onChange={setW1} />}
          {count === '2' && <TimeField label={t('reminder_n', { n: 2 })} value={w2} onChange={setW2} />}
        </View>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt bold size="large">
            {t('bedtime_reminder')} 🌙
          </Txt>
          <Switch value={bedOn} onValueChange={setBedOn} trackColor={{ true: c.primary }} />
        </Row>
        {bedOn && (
          <View style={{ marginTop: 12 }}>
            <TimeField label={t('bedtime')} value={bedTime} onChange={setBedTime} />
          </View>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt bold size="large" style={{ flex: 1 }}>
            {t('weekly_weight_reminder')} ⚖️
          </Txt>
          <Switch value={weightOn} onValueChange={setWeightOn} trackColor={{ true: c.primary }} />
        </Row>
        {weightOn && (
          <View style={{ gap: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <Chip key={d} label={t(`wd_${d - 1}` as TKey)} selected={weightDay === d} onPress={() => setWeightDay(d)} />
              ))}
            </View>
            <TimeField label={t('time')} value={weightTime} onChange={setWeightTime} />
          </View>
        )}
      </Card>

      <Button title={t('save')} icon="check-circle" loading={saving} onPress={save} />
    </Screen>
  );
}
