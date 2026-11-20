import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/settings';
import { Icon, Txt, type IconName } from './ui';

export function ProgressRing({
  pct,
  color,
  size = 110,
  stroke = 12,
  icon,
  value,
  label,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  icon: IconName;
  value: string;
  label: string;
}) {
  const c = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ alignItems: 'center', width: size + 20 }} accessible accessibilityLabel={`${label} ${value}, ${clamped}%`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.cardAlt} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={circ * (1 - clamped / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={24} color={color} />
          <Txt bold size="small">
            {clamped}%
          </Txt>
        </View>
      </View>
      <Txt bold center style={{ marginTop: 4 }}>
        {value}
      </Txt>
      <Txt muted size="small" center>
        {label}
      </Txt>
    </View>
  );
}
