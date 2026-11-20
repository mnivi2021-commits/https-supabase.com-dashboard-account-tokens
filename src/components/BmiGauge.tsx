import { View } from 'react-native';

import { BMI_COLORS, type BmiCategory } from '@/lib/health';
import { useT, useTheme } from '@/theme/settings';
import { Txt } from './ui';

// Visible scale 14 → 34, split at the Asian cut-offs.
const MIN = 14;
const MAX = 34;
const SEGMENTS: { cat: BmiCategory; from: number; to: number }[] = [
  { cat: 'under', from: MIN, to: 18.5 },
  { cat: 'normal', from: 18.5, to: 23 },
  { cat: 'over', from: 23, to: 25 },
  { cat: 'obese', from: 25, to: MAX },
];

export function BmiGauge({ bmi }: { bmi: number }) {
  const c = useTheme();
  const t = useT();
  const pos = ((Math.max(MIN, Math.min(MAX, bmi)) - MIN) / (MAX - MIN)) * 100;
  return (
    <View accessible accessibilityLabel={`BMI ${bmi}`}>
      <View style={{ height: 28, justifyContent: 'flex-end' }}>
        <View style={{ position: 'absolute', left: `${pos}%`, marginLeft: -10, bottom: 0, alignItems: 'center' }}>
          <Txt bold size="small">
            ▼
          </Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', height: 22, borderRadius: 11, overflow: 'hidden' }}>
        {SEGMENTS.map((s) => (
          <View key={s.cat} style={{ flex: s.to - s.from, backgroundColor: BMI_COLORS[s.cat] }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {SEGMENTS.map((s) => (
          <View key={s.cat} style={{ flex: s.to - s.from, alignItems: 'center' }}>
            <Txt size="small" color={c.muted} center numberOfLines={1}>
              {t(`bmi_short_${s.cat}`)}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ height: 20, marginTop: 2 }}>
        {[18.5, 23, 25].map((n) => (
          <View key={n} style={{ position: 'absolute', left: `${((n - MIN) / (MAX - MIN)) * 100}%`, marginLeft: -14, width: 28 }}>
            <Txt size="small" muted center>
              {n}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
