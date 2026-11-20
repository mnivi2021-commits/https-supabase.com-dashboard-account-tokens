import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BMI_COLORS, type BmiCategory } from '@/lib/health';
import { useTheme } from '@/theme/settings';
import { Txt } from './ui';

// The dial covers BMI 14 → 34 over a 270° arc (open at the bottom), split at the Asian cut-offs.
const MIN = 14;
const MAX = 34;
const START = 135; // degrees, bottom-left
const SWEEP = 270;
const SEGMENTS: { cat: BmiCategory; from: number; to: number }[] = [
  { cat: 'under', from: MIN, to: 18.5 },
  { cat: 'normal', from: 18.5, to: 23 },
  { cat: 'over', from: 23, to: 25 },
  { cat: 'obese', from: 25, to: MAX },
];

const angleFor = (bmi: number) => START + ((Math.max(MIN, Math.min(MAX, bmi)) - MIN) / (MAX - MIN)) * SWEEP;

function point(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = point(cx, cy, r, from);
  const b = point(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** Round BMI gauge with the value in the middle, as in the "My Health Report" design. */
export function BmiDial({ bmi, size = 170 }: { bmi: number; size?: number }) {
  const c = useTheme();
  const stroke = size * 0.09;
  const r = size / 2 - stroke;
  const cx = size / 2;
  const cy = size / 2;
  const marker = point(cx, cy, r, angleFor(bmi));
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`BMI ${bmi}`}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r - stroke * 0.9} fill={c.card} />
        {SEGMENTS.map((s) => (
          <Path
            key={s.cat}
            d={arc(cx, cy, r, angleFor(s.from) + 1, angleFor(s.to) - 1)}
            stroke={BMI_COLORS[s.cat]}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
          />
        ))}
        <Circle cx={marker.x} cy={marker.y} r={stroke * 0.75} fill="#FFFFFF" stroke={c.text} strokeWidth={3} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt bold size="large">
          BMI
        </Txt>
        <Txt bold style={{ fontSize: size * 0.24, lineHeight: size * 0.28 }}>
          {bmi.toFixed(1)}
        </Txt>
        <Txt muted size="small">
          kg/m²
        </Txt>
      </View>
    </View>
  );
}
