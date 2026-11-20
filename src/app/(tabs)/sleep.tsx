import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { TimeField } from '@/components/pickers';
import { Button, Card, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { formatHourMinute, formatTime, lastNDays, todayKey, weekdayIndex } from '@/lib/dates';
import type { SleepQuality } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const QUALITY: { q: SleepQuality; emoji: string }[] = [
  { q: 'good', emoji: '😴' },
  { q: 'okay', emoji: '😐' },
  { q: 'poor', emoji: '😫' },
];

function at(hour: number, minute: number, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Hours between bedtime and wake time, crossing midnight when needed. */
function sleepSpan(bed: Date, wake: Date): { sleepAt: Date; wakeAt: Date; hours: number } {
  const wakeAt = at(wake.getHours(), wake.getMinutes());
  let sleepAt = at(bed.getHours(), bed.getMinutes());
  if (sleepAt >= wakeAt) sleepAt = at(bed.getHours(), bed.getMinutes(), -1);
  const hours = Math.round(((wakeAt.getTime() - sleepAt.getTime()) / 3_600_000) * 10) / 10;
  return { sleepAt, wakeAt, hours };
}

export default function SleepTab() {
  const { t, colors: c } = useSettings();
  const { sleeps, saveSleep, targets, reminders } = useData();
  const today = todayKey();
  const existing = sleeps.find((s) => s.date === today);

  const [bed, setBed] = useState(existing ? new Date(existing.sleep_at) : at(22, 30));
  const [wake, setWake] = useState(existing ? new Date(existing.wake_at) : at(6, 30));
  const [quality, setQuality] = useState<SleepQuality>(existing?.quality ?? 'good');
  const [saved, setSaved] = useState(false);
  const span = sleepSpan(bed, wake);
  const bedtime = reminders.find((r) => r.kind === 'bedtime');

  const chart = useMemo(
    () =>
      lastNDays(7).map((d) => {
        const h = sleeps.find((s) => s.date === d)?.hours ?? 0;
        return {
          value: h,
          label: t(`wd_${weekdayIndex(d)}` as TKey),
          frontColor: h >= targets.sleep_hours ? '#9333EA' : '#C4B5FD',
        };
      }),
    [sleeps, targets.sleep_hours, t],
  );

  const save = () => {
    saveSleep({
      id: existing?.id,
      date: today,
      sleep_at: span.sleepAt.toISOString(),
      wake_at: span.wakeAt.toISOString(),
      hours: span.hours,
      quality,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Screen>
      <Card>
        <SectionTitle>{t('last_night')}</SectionTitle>
        <View style={{ gap: 12 }}>
          <TimeField label={t('sleep_time')} value={bed} onChange={setBed} />
          <TimeField label={t('wake_time')} value={wake} onChange={setWake} />
        </View>
        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <Txt muted>{t('total_sleep')}</Txt>
          <Txt size="hero" bold color={span.hours >= targets.sleep_hours ? c.primary : c.warning}>
            {span.hours} {t('hrs')}
          </Txt>
          <Txt muted size="small">
            {formatTime(span.sleepAt)} → {formatTime(span.wakeAt)} · {t('target')}: {targets.sleep_hours} {t('hrs')}
          </Txt>
        </View>

        <Txt bold style={{ marginBottom: 8 }}>
          {t('sleep_quality')}
        </Txt>
        <Row gap={10}>
          {QUALITY.map(({ q, emoji }) => {
            const on = quality === q;
            return (
              <Pressable
                key={q}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setQuality(q)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: on ? c.primary : c.border,
                  backgroundColor: on ? c.primarySoft : c.card,
                }}
              >
                <Txt size="hero">{emoji}</Txt>
                <Txt bold>{t(`q_${q}`)}</Txt>
              </Pressable>
            );
          })}
        </Row>
        <Button
          style={{ marginTop: 14 }}
          icon={saved ? 'check-circle' : 'content-save'}
          title={saved ? t('saved') : existing ? t('update') : t('save')}
          onPress={save}
        />
      </Card>

      <Card>
        <SectionTitle>{t('last_7_nights')}</SectionTitle>
        <BarChart
          data={chart}
          barWidth={26}
          spacing={14}
          roundedTop
          noOfSections={4}
          maxValue={Math.max(10, ...chart.map((x) => x.value))}
          yAxisThickness={0}
          xAxisColor={c.border}
          yAxisTextStyle={{ color: c.muted }}
          xAxisLabelTextStyle={{ color: c.muted }}
          rulesColor={c.border}
          isAnimated
        />
      </Card>

      <Card>
        <SectionTitle>{t('bedtime_reminder')} 🌙</SectionTitle>
        <Txt muted style={{ marginBottom: 10 }}>
          {bedtime?.enabled ? formatHourMinute(bedtime.hour, bedtime.minute) : t('no_reminders')}
        </Txt>
        <Button variant="outline" icon="bell-ring" title={t('set_reminders')} onPress={() => router.push('/reminders')} />
      </Card>
    </Screen>
  );
}
