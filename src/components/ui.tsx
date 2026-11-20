import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { font } from '@/theme/colors';
import { useTheme } from '@/theme/settings';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 24, color }: { name: IconName | string; size?: number; color?: string }) {
  const c = useTheme();
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color ?? c.text} />;
}

export function Screen({
  children,
  scroll = true,
  edges = ['left', 'right'],
  refreshControl,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

type TxtProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  size?: keyof typeof font;
  bold?: boolean;
  center?: boolean;
  color?: string;
  numberOfLines?: number;
};

export function Txt({ children, style, muted, size = 'body', bold, center, color, numberOfLines }: TxtProps) {
  const c = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: color ?? (muted ? c.muted : c.text),
          fontSize: font[size],
          fontWeight: bold ? '700' : '400',
          textAlign: center ? 'center' : undefined,
          lineHeight: font[size] * 1.35,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
      <Txt size="large" bold>
        {children}
      </Txt>
      {right}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useTheme();
  const bg: Record<ButtonVariant, string> = {
    primary: c.primary,
    secondary: c.secondary,
    outline: 'transparent',
    danger: c.danger,
    ghost: 'transparent',
  };
  const fg = variant === 'outline' || variant === 'ghost' ? (variant === 'ghost' ? c.secondary : c.primary) : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: bg[variant],
          borderColor: variant === 'outline' ? c.primary : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={small ? 18 : 22} color={fg} />}
          <Text style={{ color: fg, fontSize: small ? font.small + 1 : font.large - 1, fontWeight: '700' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label?: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && (
        <Txt bold style={{ marginBottom: 6 }}>
          {label}
        </Txt>
      )}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.inputBg }]}
      />
      {hint && (
        <Txt muted size="small" style={{ marginTop: 4 }}>
          {hint}
        </Txt>
      )}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, on && { backgroundColor: c.primary }]}
          >
            <Text style={{ color: on ? c.primaryText : c.text, fontWeight: '700', fontSize: font.body }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const c = useTheme();
  const accent = color ?? c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? accent : c.border, backgroundColor: selected ? accent : c.card },
      ]}
    >
      <Text style={{ color: selected ? '#FFFFFF' : c.text, fontSize: font.body, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color, height = 10 }: { value: number; color?: string; height?: number }) {
  const c = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.cardAlt, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height,
          borderRadius: height,
          backgroundColor: color ?? c.primary,
        }}
      />
    </View>
  );
}

export function Stat({ label, value, icon, color }: { label: string; value: string; icon?: IconName; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
      {icon && <MaterialCommunityIcons name={icon} size={26} color={color ?? c.secondary} />}
      <Txt size="large" bold center>
        {value}
      </Txt>
      <Txt muted size="small" center>
        {label}
      </Txt>
    </View>
  );
}

export function Row({ children, style, gap = 10 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
  color,
}: {
  icon?: IconName | string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.listItem, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
    >
      {icon && (
        <View style={[styles.listIcon, { backgroundColor: c.cardAlt }]}>
          <MaterialCommunityIcons name={icon as IconName} size={24} color={color ?? c.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt bold>{title}</Txt>
        {subtitle ? (
          <Txt muted size="small">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ?? (onPress ? <MaterialCommunityIcons name="chevron-right" size={26} color={c.muted} /> : null)}
    </Pressable>
  );
}

export function Loading() {
  const c = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
  },
  buttonSmall: { minHeight: 42, borderRadius: 12, paddingHorizontal: 12 },
  input: { minHeight: 54, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, fontSize: font.large },
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1 },
  segmentItem: { flex: 1, minHeight: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 16, minHeight: 46, borderRadius: 23, borderWidth: 1.5, justifyContent: 'center' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  listIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
