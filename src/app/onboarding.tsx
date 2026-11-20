import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { BmiReport } from '@/components/BmiReport';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MeasureGuide } from '@/components/MeasureGuide';
import { BloodGroupPicker, GenderPicker, HeightInput, PhotoPicker } from '@/components/pickers';
import { Button, Card, Chip, Field, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { newId, useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { addDays, todayKey } from '@/lib/dates';
import { dailyWater, goalTypeFor, round1 } from '@/lib/health';
import { ensureNotificationPermission } from '@/lib/notifications';
import { DEFAULT_SHARE, DEFAULT_TARGETS, type BloodGroup, type Gender, type HeightUnit } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const STEPS: TKey[] = [
  'q_name',
  'q_age',
  'q_gender',
  'q_height',
  'q_weight',
  'q_blood',
  'q_photo',
  'q_target',
  'bmi_report',
];

const DURATIONS = [1, 3, 6, 12];

export default function Onboarding() {
  const { t, colors: c } = useSettings();
  const { saveProfile, saveTargets, saveReminders } = useData();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weight, setWeight] = useState('');
  const [blood, setBlood] = useState<BloodGroup | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [months, setMonths] = useState(3);
  const [saving, setSaving] = useState(false);

  const weightKg = parseFloat(weight);
  const targetKg = parseFloat(target);
  const ageN = parseInt(age, 10);

  const valid = [
    name.trim().length >= 1,
    ageN >= 5 && ageN <= 110,
    !!gender,
    !!heightCm && heightCm >= 80 && heightCm <= 250,
    weightKg >= 15 && weightKg <= 300,
    !!blood,
    true,
    targetKg >= 15 && targetKg <= 300,
    true,
  ][step];

  const profileDraft = {
    name: name.trim(),
    age: ageN,
    gender: gender ?? 'male',
    height_cm: round1(heightCm ?? 0),
    height_unit: heightUnit,
    weight_kg: round1(weightKg),
    blood_group: blood ?? 'O+',
    photo_uri: photo,
    photo_path: null,
    target_weight_kg: round1(targetKg || weightKg),
    target_date: addDays(todayKey(), months * 30),
    goal_type: goalTypeFor(weightKg, targetKg || weightKg),
    share: DEFAULT_SHARE,
  } as const;

  const finish = async () => {
    setSaving(true);
    const monthly = round1(Math.min(3, Math.abs(profileDraft.target_weight_kg - profileDraft.weight_kg) / months)) || 1;
    saveTargets({
      ...DEFAULT_TARGETS,
      water_ml: dailyWater(profileDraft.weight_kg).ml,
      monthly_weight_change_kg: monthly,
    });
    // Weekly weight check-in (Sunday 8:00 AM) feeds the BMI history chart.
    try {
      const ok = await ensureNotificationPermission();
      await saveReminders([{ id: newId(), kind: 'weight', hour: 8, minute: 0, weekday: 1, enabled: ok }]);
    } catch {}
    // Saving the profile flips the navigation guard to the main tabs.
    saveProfile({ ...profileDraft }, { photoChanged: !!photo });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ gap: 6, marginTop: 8 }}>
          <Txt muted>{t('step_of', { n: step + 1, total: STEPS.length })}</Txt>
          <ProgressBar value={((step + 1) / STEPS.length) * 100} />
        </View>
        <Txt size="title" bold>
          {t(STEPS[step])}
        </Txt>

        {step === 0 && (
          <Card>
            <LanguagePicker />
            <Field
              style={{ marginTop: 16 }}
              label={t('name')}
              value={name}
              onChangeText={setName}
              placeholder={t('name_placeholder')}
              autoFocus
            />
          </Card>
        )}
        {step === 1 && (
          <Card>
            <Field label={t('age_years')} keyboardType="number-pad" value={age} onChangeText={setAge} placeholder="35" autoFocus />
          </Card>
        )}
        {step === 2 && <GenderPicker value={gender} onChange={setGender} />}
        {step === 3 && (
          <Card>
            <HeightInput
              cm={heightCm}
              unit={heightUnit}
              onChange={(cm, u) => {
                setHeightCm(cm);
                setHeightUnit(u);
              }}
            />
          </Card>
        )}
        {step === 4 && (
          <Card>
            <Field label={t('weight_kg')} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="65" autoFocus />
          </Card>
        )}
        {step === 3 && <MeasureGuide kind="height" />}
        {step === 4 && <MeasureGuide kind="weight" />}
        {step === 5 && <BloodGroupPicker value={blood} onChange={setBlood} />}
        {step === 6 && (
          <Card>
            <Txt muted style={{ marginBottom: 10 }}>
              {t('photo_optional')}
            </Txt>
            <PhotoPicker uri={photo} onChange={setPhoto} />
          </Card>
        )}
        {step === 6 && <MeasureGuide kind="photo" />}
        {step === 7 && (
          <Card>
            <Txt muted style={{ marginBottom: 10 }}>
              {t('current_weight_is', { kg: weight })}
            </Txt>
            <Field label={t('target_weight')} keyboardType="decimal-pad" value={target} onChangeText={setTarget} placeholder={weight} />
            <Txt bold style={{ marginBottom: 8 }}>
              {t('reach_in')}
            </Txt>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {DURATIONS.map((m) => (
                <Chip key={m} label={t('n_months', { n: m })} selected={months === m} onPress={() => setMonths(m)} />
              ))}
            </Row>
            <Txt muted style={{ marginTop: 10 }}>
              {t('target_date')}: {addDays(todayKey(), months * 30)}
            </Txt>
          </Card>
        )}
        {step === 8 && <BmiReport profile={profileDraft} />}

        <Row gap={12} style={{ marginTop: 6 }}>
          {step > 0 && (
            <Button style={{ flex: 1 }} variant="outline" icon="arrow-left" title={t('back')} onPress={() => setStep(step - 1)} />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              style={{ flex: 2 }}
              title={step === 6 && !photo ? t('skip') : t('next')}
              icon="arrow-right"
              disabled={!valid}
              onPress={() => setStep(step + 1)}
            />
          ) : (
            <Button style={{ flex: 2 }} title={t('start_tracking')} icon="check-circle" loading={saving} onPress={finish} />
          )}
        </Row>
        {step === 8 && (
          <Txt muted size="small" center color={c.muted}>
            {t('weekly_weight_note')}
          </Txt>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
