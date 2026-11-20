import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Button, Card, Chip, Field, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import { dailyWater } from '@/lib/health';
import { GLASS_SIZES } from '@/lib/types';
import { useSettings } from '@/theme/settings';

export default function TargetsScreen() {
  const { t } = useSettings();
  const { targets, saveTargets, profile } = useData();
  const [steps, setSteps] = useState(String(targets.steps));
  const [minutes, setMinutes] = useState(String(targets.workout_minutes));
  const [sleep, setSleep] = useState(String(targets.sleep_hours));
  const [water, setWater] = useState(String(targets.water_ml));
  const [glass, setGlass] = useState<number>(targets.glass_ml);
  const [monthly, setMonthly] = useState(String(targets.monthly_weight_change_kg));

  const n = (s: string) => parseFloat(s);
  const valid = n(steps) > 0 && n(minutes) > 0 && n(sleep) > 0 && n(water) > 0 && n(monthly) >= 0;
  const goal = profile?.goal_type ?? 'maintain';

  const save = () => {
    saveTargets({
      steps: Math.round(n(steps)),
      workout_minutes: Math.round(n(minutes)),
      sleep_hours: n(sleep),
      water_ml: Math.round(n(water)),
      glass_ml: glass,
      monthly_weight_change_kg: n(monthly),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          <SectionTitle>{t('daily_targets')}</SectionTitle>
          <Field label={`👟 ${t('steps')}`} keyboardType="number-pad" value={steps} onChangeText={setSteps} hint={t('steps_hint')} />
          <Field label={`🏃 ${t('workout_minutes')}`} keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
          <Field label={`😴 ${t('sleep_hours')}`} keyboardType="decimal-pad" value={sleep} onChangeText={setSleep} />
          <Field
            label={`💧 ${t('water_ml_target')}`}
            keyboardType="number-pad"
            value={water}
            onChangeText={setWater}
            hint={profile ? t('water_hint', { n: dailyWater(profile.weight_kg).ml }) : undefined}
          />
          <Txt bold style={{ marginBottom: 8 }}>
            {t('glass_size')}
          </Txt>
          <Row gap={8}>
            {GLASS_SIZES.map((g) => (
              <Chip key={g} label={`${g} ml`} selected={glass === g} onPress={() => setGlass(g)} />
            ))}
          </Row>
        </Card>
        <Card>
          <SectionTitle>{t('monthly_goal')}</SectionTitle>
          <Txt muted style={{ marginBottom: 8 }}>
            {goal === 'gain' ? t('monthly_gain_label') : goal === 'lose' ? t('monthly_loss_label') : t('monthly_maintain_label')}
          </Txt>
          <Field keyboardType="decimal-pad" value={monthly} onChangeText={setMonthly} hint={t('monthly_hint')} />
        </Card>
        <Button title={t('save')} icon="check-circle" disabled={!valid} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
