import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, View } from 'react-native';

import { formatTime } from '@/lib/dates';
import { cmToFeetInches, feetInchesToCm } from '@/lib/health';
import { BLOOD_GROUPS, type BloodGroup, type Gender, type HeightUnit } from '@/lib/types';
import { useT, useTheme } from '@/theme/settings';
import { Button, Chip, Field, Icon, Row, Segmented, Txt } from './ui';

export function GenderPicker({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  const t = useT();
  const c = useTheme();
  const options: { g: Gender; icon: 'gender-male' | 'gender-female' }[] = [
    { g: 'male', icon: 'gender-male' },
    { g: 'female', icon: 'gender-female' },
  ];
  return (
    <Row gap={12}>
      {options.map((o) => {
        const on = value === o.g;
        return (
          <Pressable
            key={o.g}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.g)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 22,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: on ? c.primary : c.border,
              backgroundColor: on ? c.primarySoft : c.card,
            }}
          >
            <Icon name={o.icon} size={44} color={on ? c.primary : c.muted} />
            <Txt bold size="large">
              {t(o.g)}
            </Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

export function BloodGroupPicker({ value, onChange }: { value: BloodGroup | null; onChange: (b: BloodGroup) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {BLOOD_GROUPS.map((b) => (
        <View key={b} style={{ width: '22%' }}>
          <Chip label={b} selected={value === b} onPress={() => onChange(b)} color="#DC2626" />
        </View>
      ))}
    </View>
  );
}

/** Height entry with a cm ↔ feet/inches toggle. Always reports centimetres. */
export function HeightInput({
  cm,
  unit,
  onChange,
}: {
  cm: number | null;
  unit: HeightUnit;
  onChange: (cm: number | null, unit: HeightUnit) => void;
}) {
  const t = useT();
  const fi = cm ? cmToFeetInches(cm) : null;
  const [cmText, setCmText] = useState(cm ? String(cm) : '');
  const [ftText, setFtText] = useState(fi ? String(fi.feet) : '');
  const [inText, setInText] = useState(fi ? String(fi.inches) : '');

  const switchUnit = (u: HeightUnit) => {
    if (u === unit) return;
    if (u === 'ft' && cm) {
      const v = cmToFeetInches(cm);
      setFtText(String(v.feet));
      setInText(String(v.inches));
    }
    if (u === 'cm' && cm) setCmText(String(Math.round(cm)));
    onChange(cm, u);
  };

  const fromFeet = (ft: string, inch: string) => {
    const f = parseInt(ft, 10);
    const i = parseInt(inch || '0', 10);
    onChange(Number.isFinite(f) ? feetInchesToCm(f, Number.isFinite(i) ? i : 0) : null, 'ft');
  };

  return (
    <View style={{ gap: 12 }}>
      <Segmented
        options={[
          { value: 'cm', label: t('cm') },
          { value: 'ft', label: t('feet_inches') },
        ]}
        value={unit}
        onChange={switchUnit}
      />
      {unit === 'cm' ? (
        <Field
          label={t('height_cm')}
          keyboardType="numeric"
          value={cmText}
          placeholder="165"
          onChangeText={(v) => {
            setCmText(v);
            const n = parseFloat(v);
            onChange(Number.isFinite(n) ? n : null, 'cm');
          }}
        />
      ) : (
        <Row gap={12}>
          <Field
            style={{ flex: 1 }}
            label={t('feet')}
            keyboardType="numeric"
            value={ftText}
            placeholder="5"
            onChangeText={(v) => {
              setFtText(v);
              fromFeet(v, inText);
            }}
          />
          <Field
            style={{ flex: 1 }}
            label={t('inches')}
            keyboardType="numeric"
            value={inText}
            placeholder="6"
            onChangeText={(v) => {
              setInText(v);
              fromFeet(ftText, v);
            }}
          />
        </Row>
      )}
      {cm ? (
        <Txt muted>
          = {Math.round(cm)} cm ({cmToFeetInches(cm).feet}′ {cmToFeetInches(cm).inches}″)
        </Txt>
      ) : null}
    </View>
  );
}

/** Copies the picked photo into the app's document folder so it survives cache clean-ups. */
async function keepPhoto(uri: string): Promise<string> {
  try {
    const dest = new File(Paths.document, `profile-${Date.now()}.jpg`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export function PhotoPicker({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const t = useT();
  const c = useTheme();

  const pick = async (source: 'camera' | 'gallery') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('permission_needed'), t('permission_photo'));
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return;
    onChange(await keepPhoto(res.assets[0].uri));
  };

  return (
    <View style={{ gap: 12, alignItems: 'center' }}>
      <View
        style={{
          width: 180,
          height: 260,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: c.border,
          backgroundColor: c.cardAlt,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Icon name="human-male-height" size={90} color={c.muted} />
        )}
      </View>
      <Row gap={10} style={{ alignSelf: 'stretch' }}>
        <Button style={{ flex: 1 }} variant="secondary" icon="camera" title={t('camera')} onPress={() => pick('camera')} />
        <Button style={{ flex: 1 }} variant="outline" icon="image" title={t('gallery')} onPress={() => pick('gallery')} />
      </Row>
      {uri && <Button variant="ghost" icon="delete-outline" title={t('remove_photo')} onPress={() => onChange(null)} />}
      <Row gap={8}>
        <Icon name="shield-lock-outline" color={c.primary} size={20} />
        <Txt muted size="small" style={{ flex: 1 }}>
          {t('photo_private_note')}
        </Txt>
      </Row>
    </View>
  );
}

/** A tappable time. Android opens the system dialog; iOS shows the compact inline picker. */
export function TimeField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const c = useTheme();
  const [iosValue, setIosValue] = useState(value);
  useEffect(() => setIosValue(value), [value]);

  if (Platform.OS === 'ios') {
    return (
      <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
        <Txt bold>{label}</Txt>
        <DateTimePicker
          mode="time"
          display="compact"
          value={iosValue}
          onChange={(_e, d) => {
            if (d) {
              setIosValue(d);
              onChange(d);
            }
          }}
        />
      </Row>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatTime(value)}`}
      onPress={() =>
        DateTimePickerAndroid.open({
          value,
          mode: 'time',
          is24Hour: false,
          onChange: (e, d) => {
            if (e.type === 'set' && d) onChange(d);
          },
        })
      }
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: c.border,
        backgroundColor: c.inputBg,
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 56,
      }}
    >
      <Txt bold>{label}</Txt>
      <Row gap={6}>
        <Txt size="large" bold color={c.secondary}>
          {formatTime(value)}
        </Txt>
        <Icon name="clock-edit-outline" color={c.secondary} />
      </Row>
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 52 }: { uri?: string | null; name: string; size?: number }) {
  const c = useTheme();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.secondarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt bold color={c.secondary} size={size > 60 ? 'title' : 'large'}>
        {(name.trim()[0] ?? '?').toUpperCase()}
      </Txt>
    </View>
  );
}
