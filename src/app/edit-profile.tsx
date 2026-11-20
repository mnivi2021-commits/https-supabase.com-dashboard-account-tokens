import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { BloodGroupPicker, GenderPicker, HeightInput, PhotoPicker } from '@/components/pickers';
import { Button, Card, Field, Row, Screen, SectionTitle } from '@/components/ui';
import { useData } from '@/data/store';
import { goalTypeFor, round1 } from '@/lib/health';
import { useSettings } from '@/theme/settings';

export default function EditProfile() {
  const { t } = useSettings();
  const { profile, saveProfile } = useData();
  const p = profile!;
  const [name, setName] = useState(p.name);
  const [age, setAge] = useState(String(p.age));
  const [gender, setGender] = useState(p.gender);
  const [heightCm, setHeightCm] = useState<number | null>(p.height_cm);
  const [heightUnit, setHeightUnit] = useState(p.height_unit);
  const [weight, setWeight] = useState(String(p.weight_kg));
  const [blood, setBlood] = useState(p.blood_group);
  const [photo, setPhoto] = useState(p.photo_uri);
  const [target, setTarget] = useState(String(p.target_weight_kg));
  const [targetDate, setTargetDate] = useState(p.target_date);

  const w = parseFloat(weight);
  const tw = parseFloat(target);
  const a = parseInt(age, 10);
  const valid =
    name.trim().length > 0 &&
    a >= 5 &&
    a <= 110 &&
    !!heightCm &&
    heightCm >= 80 &&
    heightCm <= 250 &&
    w >= 15 &&
    w <= 300 &&
    tw >= 15 &&
    tw <= 300 &&
    /^\d{4}-\d{2}-\d{2}$/.test(targetDate);

  const save = () => {
    saveProfile(
      {
        ...p,
        name: name.trim(),
        age: a,
        gender,
        height_cm: round1(heightCm ?? p.height_cm),
        height_unit: heightUnit,
        weight_kg: round1(w),
        blood_group: blood,
        photo_uri: photo,
        target_weight_kg: round1(tw),
        target_date: targetDate,
        goal_type: goalTypeFor(w, tw),
      },
      { photoChanged: photo !== p.photo_uri },
    );
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          <Field label={t('name')} value={name} onChangeText={setName} />
          <Row gap={12}>
            <Field style={{ flex: 1 }} label={t('age')} keyboardType="number-pad" value={age} onChangeText={setAge} />
            <Field style={{ flex: 1 }} label={t('weight_kg')} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
          </Row>
        </Card>
        <Card>
          <SectionTitle>{t('gender')}</SectionTitle>
          <GenderPicker value={gender} onChange={setGender} />
        </Card>
        <Card>
          <SectionTitle>{t('height')}</SectionTitle>
          <HeightInput
            cm={heightCm}
            unit={heightUnit}
            onChange={(cm, u) => {
              setHeightCm(cm);
              setHeightUnit(u);
            }}
          />
        </Card>
        <Card>
          <SectionTitle>{t('blood_group')}</SectionTitle>
          <BloodGroupPicker value={blood} onChange={setBlood} />
        </Card>
        <Card>
          <SectionTitle>{t('photo')}</SectionTitle>
          <PhotoPicker uri={photo} onChange={setPhoto} />
        </Card>
        <Card>
          <SectionTitle>{t('your_target')}</SectionTitle>
          <Field label={t('target_weight')} keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
          <Field label={t('target_date')} value={targetDate} onChangeText={setTargetDate} placeholder="2027-03-31" hint="YYYY-MM-DD" />
        </Card>
        <Button title={t('save')} icon="check-circle" disabled={!valid} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
