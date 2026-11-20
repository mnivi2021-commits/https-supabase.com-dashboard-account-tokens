import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/pickers';
import { ProgressRing } from '@/components/ProgressRing';
import { Button, Card, Chip, Icon, ProgressBar, Row, Screen, SectionTitle, Stat, Txt } from '@/components/ui';
import { useStepsStatus } from '@/data/steps';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { dayOfYear, todayKey } from '@/lib/dates';
import { BMI_COLORS, bmiCategory, calcBmi, workoutMeta } from '@/lib/health';
import { currentStreak, daySummary } from '@/lib/metrics';
import { GLASS_SIZES } from '@/lib/types';
import { useSettings } from '@/theme/settings';

export default function Home() {
  const { t, colors: c } = useSettings();
  const data = useData();
  const steps = useStepsStatus();
  const today = todayKey();
  const sum = daySummary(data, today);
  const streak = currentStreak(data.workouts);
  const p = data.profile;
  if (!p) return null;
  const bmi = calcBmi(p.weight_kg, p.height_cm);
  const hour = new Date().getHours();
  const greet: TKey = hour < 12 ? 'good_morning' : hour < 17 ? 'good_afternoon' : 'good_evening';
  const motivation = t(`motivation_${dayOfYear() % 10}` as TKey);

  return (
    <Screen>
      <Row gap={12}>
        <Avatar uri={p.photo_uri} name={p.name} size={60} />
        <View style={{ flex: 1 }}>
          <Txt muted>{t(greet)}</Txt>
          <Txt size="title" bold numberOfLines={1}>
            {p.name}
          </Txt>
        </View>
        <Pressable
          onPress={() => router.push('/bmi-report')}
          accessibilityRole="button"
          style={{ alignItems: 'center', backgroundColor: BMI_COLORS[bmiCategory(bmi)], borderRadius: 14, padding: 8, minWidth: 64 }}
        >
          <Txt size="small" color="#FFFFFF">
            BMI
          </Txt>
          <Txt bold size="large" color="#FFFFFF">
            {bmi.toFixed(1)}
          </Txt>
        </Pressable>
      </Row>

      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
        <Row gap={10}>
          <Txt size="hero">🔥</Txt>
          <View style={{ flex: 1 }}>
            <Txt size="title" bold>
              {t('streak_days', { n: streak })}
            </Txt>
            <Txt muted>{streak > 0 ? t('streak_keep') : t('streak_start')}</Txt>
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle right={<Txt bold color={c.primary}>{sum.targetPct}%</Txt>}>{t('todays_targets')}</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 14 }}>
          <ProgressRing pct={sum.pct.steps} color="#16A34A" icon="shoe-print" value={sum.steps.toLocaleString()} label={t('steps')} />
          <ProgressRing pct={sum.pct.minutes} color="#F97316" icon="dumbbell" value={`${sum.minutes} ${t('min')}`} label={t('workout')} />
          <ProgressRing pct={sum.pct.sleep} color="#9333EA" icon="sleep" value={`${sum.sleepHours} ${t('hrs')}`} label={t('sleep')} />
          <ProgressRing pct={sum.pct.water} color="#0284C7" icon="cup-water" value={`${sum.water} ml`} label={t('water')} />
        </View>
        {steps.available === false && (
          <Txt muted size="small" center style={{ marginTop: 10 }}>
            {t('pedometer_unavailable')}
          </Txt>
        )}
      </Card>

      <WaterCard />

      <Card>
        <SectionTitle>{t('today')}</SectionTitle>
        <Row>
          <Stat icon="fire" color="#F97316" label={t('calories_burned')} value={`${sum.calories}`} />
          <Stat icon="timer-outline" label={t('active_minutes')} value={`${sum.minutes}`} />
          <Stat icon="format-list-checks" color={c.primary} label={t('workouts')} value={`${sum.workouts.length}`} />
        </Row>
        {sum.workouts.map((w) => {
          const m = workoutMeta(w.type);
          return (
            <Row key={w.id} gap={10} style={{ marginTop: 8 }}>
              <Icon name={m.icon} color={m.color} />
              <Txt style={{ flex: 1 }}>{t(`w_${w.type}`)}</Txt>
              <Txt muted>{w.calories} kcal</Txt>
            </Row>
          );
        })}
      </Card>

      <Row gap={10}>
        <Button style={{ flex: 1 }} icon="plus" title={t('log_workout')} onPress={() => router.push('/workout')} />
        <Button style={{ flex: 1 }} variant="secondary" icon="walk" title={t('live_walk')} onPress={() => router.push('/walk')} />
      </Row>
      <Row gap={10}>
        <Button style={{ flex: 1 }} variant="outline" icon="sleep" title={t('log_sleep')} onPress={() => router.push('/sleep')} />
        <Button style={{ flex: 1 }} variant="outline" icon="scale-bathroom" title={t('weight')} onPress={() => router.push('/weight')} />
      </Row>

      <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
        <Row gap={10}>
          <Icon name="lightbulb-on-outline" color={c.secondary} size={28} />
          <Txt style={{ flex: 1 }}>{motivation}</Txt>
        </Row>
      </Card>
    </Screen>
  );
}

function WaterCard() {
  const { t, colors: c } = useSettings();
  const { water, targets, setWater, saveTargets } = useData();
  const today = todayKey();
  const ml = water[today] ?? 0;
  const goal = targets.water_ml;
  const glass = targets.glass_ml;
  const glassesDone = Math.floor(ml / glass);
  const glassesGoal = Math.ceil(goal / glass);
  return (
    <Card>
      <SectionTitle right={<Txt bold color={c.secondary}>{ml} / {goal} ml</Txt>}>{t('water')} 💧</SectionTitle>
      <ProgressBar value={(ml / goal) * 100} color={c.secondary} height={14} />
      <Txt muted size="small" style={{ marginTop: 6, marginBottom: 10 }}>
        {t('glasses_progress', { n: glassesDone, total: glassesGoal, ml: glass })}
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {Array.from({ length: Math.min(20, Math.max(glassesGoal, glassesDone)) }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => setWater(today, (i + 1 === glassesDone ? i : i + 1) * glass)}
            accessibilityLabel={`${(i + 1) * glass} ml`}
          >
            <Icon name={i < glassesDone ? 'cup-water' : 'cup-outline'} size={32} color={i < glassesDone ? c.secondary : c.muted} />
          </Pressable>
        ))}
      </View>
      <Txt bold style={{ marginBottom: 6 }}>
        {t('glass_size')}
      </Txt>
      <Row gap={8} style={{ marginBottom: 12 }}>
        {GLASS_SIZES.map((g) => (
          <Chip key={g} label={`${g} ml`} selected={glass === g} color={c.secondary} onPress={() => saveTargets({ ...targets, glass_ml: g })} />
        ))}
      </Row>
      <Row gap={10}>
        <Button style={{ flex: 1 }} variant="outline" icon="minus" title={`${glass}`} onPress={() => setWater(today, ml - glass)} disabled={ml === 0} />
        <Button style={{ flex: 2 }} variant="secondary" icon="plus" title={`${glass} ml`} onPress={() => setWater(today, ml + glass)} />
      </Row>
    </Card>
  );
}
