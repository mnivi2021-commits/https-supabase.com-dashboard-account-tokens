import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useSettings } from '@/theme/settings';
import { Row, Txt, type IconName } from './ui';
import { BRAND } from './WelcomeArt';

/** Gradient icon square + big title + subtitle (e.g. "Workout Track — Track • Train • Improve"). */
export function TitleTile({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  const { colors: c, isDark } = useSettings();
  return (
    <Row gap={14}>
      <LinearGradient
        colors={[BRAND.blueLight, BRAND.blue]}
        style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name={icon} size={42} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Txt size="title" bold color={isDark ? c.text : BRAND.navy} style={{ fontSize: 28, lineHeight: 34 }}>
          {title}
        </Txt>
        {subtitle ? <Txt muted>{subtitle}</Txt> : null}
      </View>
    </Row>
  );
}

const TINTS = {
  orange: { light: '#FFF4E6', dark: '#3A2410', icon: '#F97316' },
  blue: { light: '#E0F2FE', dark: '#0C2A3A', icon: '#0284C7' },
  green: { light: '#DCFCE7', dark: '#14351F', icon: '#16A34A' },
  purple: { light: '#F3E8FF', dark: '#2A1A3A', icon: '#9333EA' },
} as const;

/** Small coloured tile: icon + label + big value (+ unit). */
export function StatTile({
  icon,
  label,
  value,
  unit,
  tint,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  tint: keyof typeof TINTS;
}) {
  const { isDark, colors: c } = useSettings();
  const k = TINTS[tint];
  return (
    <Row
      gap={8}
      style={{
        flex: 1,
        minWidth: '46%',
        backgroundColor: isDark ? k.dark : k.light,
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <MaterialCommunityIcons name={icon} size={30} color={k.icon} />
      <View style={{ flex: 1 }}>
        <Txt size="small" muted numberOfLines={1}>
          {label}
        </Txt>
        <Txt bold size="large">
          {value}
          {unit ? <Txt size="small" bold>{` ${unit}`}</Txt> : null}
        </Txt>
      </View>
    </Row>
  );
}

/** Big green progress ring with % and a caption in the middle. */
export function BigRing({ pct, caption, size = 140 }: { pct: number; caption: string; size?: number }) {
  const { colors: c } = useSettings();
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${p}% ${caption}`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.primarySoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={BRAND.greenLight}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt bold style={{ fontSize: 30, lineHeight: 36 }}>
          {p}%
        </Txt>
        <Txt muted size="small" center>
          {caption}
        </Txt>
      </View>
    </View>
  );
}
