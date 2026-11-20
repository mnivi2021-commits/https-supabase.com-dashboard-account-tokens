import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { addDays, todayKey } from '@/lib/dates';
import { cmToFeetInches, feetInchesToCm, goalTypeFor, round1 } from '@/lib/health';
import { BLOOD_GROUPS, DEFAULT_SHARE, type BloodGroup, type Gender, type HeightUnit, type Profile } from '@/lib/types';
import { font } from '@/theme/colors';
import { useSettings, useTheme } from '@/theme/settings';
import { WaveBanner } from './AppHeader';
import { MeasureGuide } from './MeasureGuide';
import { choosePhoto } from './pickers';
import { Card, Chip, Icon, Row, Txt, type IconName } from './ui';
import { BRAND, GradientButton } from './WelcomeArt';

export type ProfileDraft = Omit<Profile, 'updated_at'>;

/** Label column with icon + red star, as in the design. */
function FormRow({ icon, label, required, children }: { icon: IconName; label: string; required?: boolean; children: ReactNode }) {
  const { colors: c, isDark } = useSettings();
  return (
    <View style={{ paddingVertical: 8 }}>
      <Row gap={10} style={{ alignItems: 'center' }}>
        <Icon name={icon} size={28} color={isDark ? c.text : BRAND.navy} />
        <Txt bold style={{ flex: 1 }}>
          {label}
          {required ? <Txt color={c.danger}> *</Txt> : null}
        </Txt>
      </Row>
      <View style={{ marginTop: 6, marginLeft: 38 }}>{children}</View>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: c.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          fontSize: font.large,
          color: c.text,
          backgroundColor: c.inputBg,
        },
        props.style,
      ]}
    />
  );
}

/** Dropdown-looking box that opens a big, easy list. */
function Select<T extends string | number>({
  value,
  options,
  onChange,
  title,
  placeholder = '—',
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  title: string;
  placeholder?: string;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: c.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: c.inputBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <Txt size="large" muted={!current}>
          {current?.label ?? placeholder}
        </Txt>
        <MaterialCommunityIcons name="chevron-down" size={24} color={c.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor: c.card, borderRadius: 20, padding: 12, maxHeight: '75%' }}>
            <Txt bold size="large" style={{ padding: 8 }}>
              {title}
            </Txt>
            <ScrollView>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{
                      minHeight: 54,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: on ? c.primarySoft : undefined,
                    }}
                  >
                    <Txt size="large" bold={on}>
                      {o.label}
                    </Txt>
                    {on && <MaterialCommunityIcons name="check" size={24} color={c.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function HowTo({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  const c = useTheme();
  return (
    <Pressable onPress={onToggle} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
      <MaterialCommunityIcons name={open ? 'chevron-up' : 'lightbulb-on-outline'} size={18} color={c.secondary} />
      <Txt size="small" bold color={c.secondary}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * One-page "My Profile" form (design mock-up): photo in a wave banner, icon rows,
 * and a big "Calculate BMI" button. Used for first-time setup and editing.
 */
export function ProfileForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<Profile>;
  submitLabel: string;
  onSubmit: (draft: ProfileDraft, photoChanged: boolean) => void;
}) {
  const { t, colors: c } = useSettings();
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [unit, setUnit] = useState<HeightUnit>(initial?.height_unit ?? 'cm');
  const fi = initial?.height_cm ? cmToFeetInches(initial.height_cm) : null;
  const [cm, setCm] = useState(initial?.height_cm ? String(Math.round(initial.height_cm)) : '');
  const [ft, setFt] = useState(fi ? String(fi.feet) : '');
  const [inch, setInch] = useState(fi ? String(fi.inches) : '');
  const [weight, setWeight] = useState(initial?.weight_kg ? String(initial.weight_kg) : '');
  const [blood, setBlood] = useState<BloodGroup | null>(initial?.blood_group ?? null);
  const [target, setTarget] = useState(initial?.target_weight_kg ? String(initial.target_weight_kg) : '');
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? addDays(todayKey(), 90));
  const [issues, setIssues] = useState(initial?.health_issues ?? '');
  const [photo, setPhoto] = useState<string | null>(initial?.photo_uri ?? null);
  const [guide, setGuide] = useState<'height' | 'weight' | 'photo' | null>(null);

  const heightCm =
    unit === 'cm'
      ? parseFloat(cm)
      : Number.isFinite(parseInt(ft, 10))
        ? feetInchesToCm(parseInt(ft, 10), parseInt(inch || '0', 10) || 0)
        : NaN;
  const w = parseFloat(weight);
  const a = parseInt(age, 10);
  const tw = parseFloat(target) || w;

  const dateOptions = [
    ...(initial?.target_date ? [{ value: initial.target_date, label: initial.target_date }] : []),
    ...[1, 3, 6, 12].map((m) => ({ value: addDays(todayKey(), m * 30), label: t('n_months', { n: m }) })),
  ];

  const photoMenu = () =>
    Alert.alert(t('photo'), t('photo_private_note'), [
      { text: t('camera'), onPress: async () => setPhoto((await choosePhoto('camera', t)) ?? photo) },
      { text: t('gallery'), onPress: async () => setPhoto((await choosePhoto('gallery', t)) ?? photo) },
      ...(photo ? [{ text: t('remove_photo'), style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: t('cancel'), style: 'cancel' as const },
    ]);

  const submit = () => {
    const missing: string[] = [];
    if (!name.trim()) missing.push(t('name'));
    if (!(a >= 5 && a <= 110)) missing.push(t('age'));
    if (!gender) missing.push(t('gender'));
    if (!(heightCm >= 80 && heightCm <= 250)) missing.push(t('height'));
    if (!(w >= 15 && w <= 300)) missing.push(t('weight'));
    if (!blood) missing.push(t('blood_group'));
    if (!(tw >= 15 && tw <= 300)) missing.push(t('target_weight'));
    if (missing.length) {
      Alert.alert(t('please_fill'), missing.join('\n'));
      return;
    }
    onSubmit(
      {
        name: name.trim(),
        age: a,
        gender: gender!,
        height_cm: round1(heightCm),
        height_unit: unit,
        weight_kg: round1(w),
        blood_group: blood!,
        health_issues: issues.trim() || null,
        photo_uri: photo,
        photo_path: initial?.photo_path ?? null,
        photo_pending: initial?.photo_pending,
        target_weight_kg: round1(tw),
        target_date: targetDate,
        goal_type: goalTypeFor(w, tw),
        share: initial?.share ?? DEFAULT_SHARE,
      },
      photo !== (initial?.photo_uri ?? null),
    );
  };

  const avatar = (
    <Pressable onPress={photoMenu} accessibilityRole="button" accessibilityLabel={t('photo')}>
      <View
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          borderWidth: 4,
          borderColor: '#FFFFFF',
          backgroundColor: '#E3F2FD',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <MaterialCommunityIcons name="account" size={70} color={BRAND.blueLight} />
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 2,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: BRAND.navy,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );

  return (
    <View style={{ gap: 14 }}>
      <WaveBanner title={t('my_profile')} subtitle={t('enter_health_details')} left={avatar} />
      <HowTo open={guide === 'photo'} onToggle={() => setGuide(guide === 'photo' ? null : 'photo')} label={t('guide_photo_title')} />
      {guide === 'photo' && <MeasureGuide kind="photo" />}

      <Card style={{ borderRadius: 24 }}>
        <FormRow icon="account-outline" label={t('name')} required>
          <Input value={name} onChangeText={setName} placeholder={t('name_placeholder')} />
        </FormRow>

        <FormRow icon="calendar-month-outline" label={t('age_years')} required>
          <Input value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="35" maxLength={3} />
        </FormRow>

        <FormRow icon="gender-male-female" label={t('gender')} required>
          <Row gap={10}>
            <Chip label={`♂ ${t('male')}`} selected={gender === 'male'} onPress={() => setGender('male')} />
            <Chip label={`♀ ${t('female')}`} selected={gender === 'female'} onPress={() => setGender('female')} color="#DB2777" />
          </Row>
        </FormRow>

        <FormRow icon="ruler" label={t('height')} required>
          <Row gap={8}>
            {unit === 'cm' ? (
              <Input style={{ flex: 1 }} value={cm} onChangeText={setCm} keyboardType="numeric" placeholder="162" />
            ) : (
              <>
                <Input style={{ flex: 1 }} value={ft} onChangeText={setFt} keyboardType="number-pad" placeholder={`5 ${t('feet')}`} />
                <Input style={{ flex: 1 }} value={inch} onChangeText={setInch} keyboardType="number-pad" placeholder={`4 ${t('inches')}`} />
              </>
            )}
            <View style={{ width: 96 }}>
              <Select<HeightUnit>
                title={t('height')}
                value={unit}
                onChange={(u) => {
                  if (u === 'ft' && Number.isFinite(heightCm)) {
                    const v = cmToFeetInches(heightCm);
                    setFt(String(v.feet));
                    setInch(String(v.inches));
                  }
                  if (u === 'cm' && Number.isFinite(heightCm)) setCm(String(Math.round(heightCm)));
                  setUnit(u);
                }}
                options={[
                  { value: 'cm', label: 'cm' },
                  { value: 'ft', label: 'ft/in' },
                ]}
              />
            </View>
          </Row>
          <HowTo open={guide === 'height'} onToggle={() => setGuide(guide === 'height' ? null : 'height')} label={t('guide_height_title')} />
        </FormRow>
        {guide === 'height' && <MeasureGuide kind="height" />}

        <FormRow icon="scale-bathroom" label={t('weight')} required>
          <Row gap={8}>
            <Input style={{ flex: 1 }} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="60" />
            <View style={{ width: 96, minHeight: 50, borderRadius: 12, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size="large">kg</Txt>
            </View>
          </Row>
          <HowTo open={guide === 'weight'} onToggle={() => setGuide(guide === 'weight' ? null : 'weight')} label={t('guide_weight_title')} />
        </FormRow>
        {guide === 'weight' && <MeasureGuide kind="weight" />}

        <FormRow icon="water-outline" label={t('blood_group')} required>
          <Select<BloodGroup>
            title={t('blood_group')}
            value={blood}
            onChange={setBlood}
            placeholder={t('choose')}
            options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))}
          />
        </FormRow>

        <FormRow icon="target" label={t('target_weight')} required>
          <Row gap={8}>
            <Input style={{ flex: 1 }} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={weight || '55'} />
            <View style={{ width: 130 }}>
              <Select<string> title={t('reach_in')} value={targetDate} onChange={setTargetDate} options={dateOptions} />
            </View>
          </Row>
        </FormRow>

        <FormRow icon="stethoscope" label={t('health_issue_q')}>
          <Input
            value={issues}
            onChangeText={setIssues}
            placeholder={t('health_issue_placeholder')}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }}
          />
          <Txt muted size="small" style={{ marginTop: 4 }}>
            🔒 {t('health_issue_private')}
          </Txt>
        </FormRow>
      </Card>

      <GradientButton title={submitLabel} icon="calculator-variant" colors={[BRAND.greenLight, BRAND.green]} onPress={submit} />
    </View>
  );
}
