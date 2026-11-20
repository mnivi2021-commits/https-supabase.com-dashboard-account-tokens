import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, View } from 'react-native';

import { formatTime } from '@/lib/dates';
import { useTheme } from '@/theme/settings';
import { Icon, Row, Txt } from './ui';

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

/** Opens the camera or gallery and returns a kept copy of the photo (null if cancelled / not allowed). */
export async function choosePhoto(
  source: 'camera' | 'gallery',
  t: (k: 'permission_needed' | 'permission_photo') => string,
): Promise<string | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(t('permission_needed'), t('permission_photo'));
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  return keepPhoto(res.assets[0].uri);
}
