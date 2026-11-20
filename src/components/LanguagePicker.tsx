import { View } from 'react-native';

import { LANGUAGES } from '@/i18n';
import { useSettings } from '@/theme/settings';
import { Chip } from './ui';

export function LanguagePicker() {
  const { language, setLanguage } = useSettings();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
      {LANGUAGES.map((l) => (
        <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
      ))}
    </View>
  );
}
