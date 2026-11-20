import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { useTheme } from '@/theme/settings';
import { Txt } from './ui';
import { BRAND, Logo, Wordmark } from './WelcomeArt';

/** Brand header from the design: back arrow · logo + "Health Tracker" · bell (reminders). */
export function AppHeader({ onBack, showBell = true }: { onBack?: (() => void) | null; showBell?: boolean }) {
  const c = useTheme();
  const back = onBack === undefined ? (router.canGoBack() ? () => router.back() : null) : onBack;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={back ?? undefined}
        disabled={!back}
        hitSlop={14}
        style={{ width: 44, opacity: back ? 1 : 0 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={30} color={c.text} />
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Logo size={64} />
        <Wordmark first="Health" second="Tracker" size={24} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reminders"
        onPress={showBell ? () => router.push('/reminders') : undefined}
        disabled={!showBell}
        hitSlop={14}
        style={{ width: 44, alignItems: 'flex-end', opacity: showBell ? 1 : 0 }}
      >
        <MaterialCommunityIcons name="bell-outline" size={30} color={c.text} />
      </Pressable>
    </View>
  );
}

/** Blue → green wave banner with a title, subtitle and an optional left element (photo). */
export function WaveBanner({
  title,
  subtitle,
  left,
  icon,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  icon?: string;
}) {
  return (
    <View style={{ borderRadius: 24, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <SvgGradient id="banner" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BRAND.blue} />
            <Stop offset="0.6" stopColor={BRAND.blueLight} />
            <Stop offset="1" stopColor={BRAND.greenLight} />
          </SvgGradient>
        </Defs>
        <Path d="M0 0 H100 V100 H0 Z" fill="url(#banner)" />
        <Path d="M0 78 Q 30 62 60 78 T 100 72 V100 H0 Z" fill="#FFFFFF" opacity={0.18} />
        {/* heartbeat line */}
        <Path d="M64 30 h8 l3 -8 l4 14 l3 -6 h8" stroke="#FFFFFF" strokeWidth={0.9} fill="none" opacity={0.7} />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, minHeight: 130 }}>
        {left}
        <View style={{ flex: 1 }}>
          {icon && <MaterialCommunityIcons name={icon as never} size={30} color="#FFFFFF" />}
          <Txt size="title" bold color="#FFFFFF">
            {title}
          </Txt>
          {subtitle ? <Txt color="#E3F2FD">{subtitle}</Txt> : null}
        </View>
      </View>
    </View>
  );
}
