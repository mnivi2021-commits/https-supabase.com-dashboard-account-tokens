import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Rect, Stop, LinearGradient as SvgGradient, Text as SvgText } from 'react-native-svg';

import { useSettings, useTheme } from '@/theme/settings';
import type { IconName } from './ui';

export const BRAND = {
  blue: '#1565C0',
  blueLight: '#1E88E5',
  green: '#2E9E3E',
  greenLight: '#43B649',
  navy: '#12306B',
  orange: '#F57C00',
};

/** Heart made of a blue and a green stroke, with a plus and a person — the app logo. */
export function Logo({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.9} viewBox="0 0 100 90">
      {/* orange swoosh */}
      <Path d="M2 64 Q 22 52 44 57" stroke={BRAND.orange} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* heart halves */}
      <Path d="M50 84 C 22 62 6 46 11 26 C 16 9 39 6 50 23" stroke={BRAND.blue} strokeWidth={7} fill="none" strokeLinecap="round" />
      <Path d="M50 23 C 61 6 84 9 89 26 C 94 46 78 62 50 84" stroke={BRAND.greenLight} strokeWidth={7} fill="none" strokeLinecap="round" />
      {/* plus */}
      <Rect x={27} y={20} width={6} height={20} rx={1.5} fill={BRAND.greenLight} />
      <Rect x={20} y={27} width={20} height={6} rx={1.5} fill={BRAND.greenLight} />
      {/* person: head + arms-up body */}
      <Circle cx={60} cy={34} r={6} fill={BRAND.blue} />
      <Path d="M40 46 Q 50 66 62 62 Q 74 56 80 30" stroke={BRAND.green} strokeWidth={7} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** "Health" in navy, "Tracker" in green, with a green swoosh underneath. */
export function Wordmark({ first, second, size = 40 }: { first: string; second: string; size?: number }) {
  const { isDark, colors: c } = useSettings();
  const navy = isDark ? c.text : BRAND.navy; // readable in dark mode
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: size, fontWeight: '800', fontStyle: 'italic', letterSpacing: -0.5 }}>
        <Text style={{ color: navy }}>{first} </Text>
        <Text style={{ color: BRAND.green }}>{second}</Text>
      </Text>
      <Svg width={size * 5.5} height={size * 0.4} viewBox="0 0 220 16">
        <Path d="M20 10 Q 120 0 210 8" stroke={BRAND.green} strokeWidth={4} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Clipboard with "Analysis Report", bar chart, pie and check marks. */
export function ReportClipboard({ title, width = 130 }: { title: string; width?: number }) {
  const h = width * 1.35;
  return (
    <Svg width={width} height={h} viewBox="0 0 130 175">
      <G rotation={6} origin="65, 90">
        <Rect x={8} y={14} width={114} height={156} rx={10} fill="#FFFFFF" stroke={BRAND.blueLight} strokeWidth={5} />
        {/* clip */}
        <Rect x={44} y={4} width={42} height={18} rx={5} fill="#90A4AE" />
        <Rect x={52} y={8} width={26} height={8} rx={3} fill="#ECEFF1" />
        <SvgText x={65} y={42} fontSize={12} fontWeight="bold" fontStyle="italic" fill={BRAND.navy} textAnchor="middle">
          {title}
        </SvgText>
        {/* bars */}
        <Line x1={20} y1={98} x2={74} y2={98} stroke="#B0BEC5" strokeWidth={1.5} />
        <Rect x={24} y={82} width={8} height={16} fill={BRAND.blueLight} />
        <Rect x={36} y={74} width={8} height={24} fill={BRAND.blueLight} />
        <Rect x={48} y={66} width={8} height={32} fill={BRAND.greenLight} />
        <Rect x={60} y={56} width={8} height={42} fill={BRAND.greenLight} />
        {/* pie */}
        <Circle cx={98} cy={72} r={14} fill="none" stroke={BRAND.blueLight} strokeWidth={10} />
        <Circle
          cx={98}
          cy={72}
          r={14}
          fill="none"
          stroke={BRAND.greenLight}
          strokeWidth={10}
          strokeDasharray={`${2 * Math.PI * 14 * 0.35} ${2 * Math.PI * 14}`}
          rotation={-90}
          origin="98, 72"
        />
        {/* checks + lines */}
        {[118, 142].map((y) => (
          <G key={y}>
            <Path d={`M20 ${y} l5 5 l9 -11`} stroke={BRAND.green} strokeWidth={3.5} fill="none" strokeLinecap="round" />
            <Rect x={40} y={y - 3} width={66} height={6} rx={3} fill="#CFE3F7" />
          </G>
        ))}
      </G>
    </Svg>
  );
}

/** Rounded pill: green heart-pulse badge + label. */
export function ReportPill({ label }: { label: string }) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: c.card,
        borderRadius: 40,
        paddingRight: 18,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
      }}
    >
      <LinearGradient
        colors={[BRAND.greenLight, BRAND.green]}
        style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="heart-pulse" size={30} color="#FFFFFF" />
      </LinearGradient>
      <Text style={{ fontSize: 18, fontWeight: '800', fontStyle: 'italic', color: c.text }}>{label}</Text>
    </View>
  );
}

/** Big gradient button used on the welcome screen. */
export function GradientButton({
  title,
  icon,
  colors,
  onPress,
}: {
  title: string;
  icon: IconName;
  colors: [string, string];
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 68,
          borderRadius: 18,
          paddingHorizontal: 20,
          gap: 16,
        }}
      >
        <MaterialCommunityIcons name={icon} size={34} color="#FFFFFF" />
        <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>{title}</Text>
        <MaterialCommunityIcons name="chevron-right" size={32} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

/** Stethoscope + heartbeat line + blue/green wave along the bottom. */
export function BottomArt({ width }: { width: number }) {
  const c = useTheme();
  return (
    <View style={{ width, height: 130, marginTop: 6 }}>
      <View style={{ position: 'absolute', left: 18, top: 0 }}>
        <MaterialCommunityIcons name="stethoscope" size={74} color={c.muted} />
      </View>
      <Svg width={width} height={130} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgGradient id="wave" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BRAND.blue} />
            <Stop offset="1" stopColor={BRAND.greenLight} />
          </SvgGradient>
        </Defs>
        {/* heartbeat with a heart in the middle */}
        <Path
          d={`M${width * 0.42} 46 h${width * 0.08} l8 -18 l10 34 l8 -16 h${width * 0.05}`}
          stroke={c.muted}
          strokeWidth={2.5}
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d={`M${width * 0.72} 54 c -14 -10 -18 -18 -12 -25 c 5 -5 11 -3 12 2 c 1 -5 7 -7 12 -2 c 6 7 2 15 -12 25 z`}
          stroke={c.muted}
          strokeWidth={2.5}
          fill="none"
        />
        <Path d={`M${width * 0.72 + 14} 38 h${width * 0.16}`} stroke={c.muted} strokeWidth={2.5} />
        {/* waves */}
        <Path d={`M0 104 Q ${width * 0.3} 78 ${width * 0.6} 96 T ${width} 84 V130 H0 Z`} fill="url(#wave)" />
        <Path d={`M0 116 Q ${width * 0.35} 96 ${width * 0.65} 112 T ${width} 104 V130 H0 Z`} fill={c.card} opacity={0.55} />
      </Svg>
    </View>
  );
}
