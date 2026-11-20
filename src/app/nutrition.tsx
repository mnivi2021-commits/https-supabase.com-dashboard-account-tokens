import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Chip, Icon, Row, Txt } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { useData } from '@/data/store';
import { macroTargets } from '@/lib/foods';
import { BMI_COLORS, bmiCategory, calcBmi, dailyCalories, dailyWater } from '@/lib/health';
import {
  ABSORPTION_TIPS,
  DIET_FOCUS,
  MEAL_PLAN,
  PORTION_HINT,
  proteinRange,
  type DietPref,
} from '@/lib/nutritionPlan';
import { useSettings } from '@/theme/settings';
import { SafeAreaView } from 'react-native-safe-area-context';

const PREF_KEY = 'ht:diet-pref';

const SECTIONS = [
  { n: 1, key: 'nut_s1', icon: 'water', from: '#1E88E5', to: '#1565C0', tint: '#E3F2FD' },
  { n: 2, key: 'nut_s2', icon: 'scale-bathroom', from: '#43B649', to: '#2E9E3E', tint: '#E8F5E9' },
  { n: 3, key: 'nut_s3', icon: 'room-service', from: '#FB7185', to: '#E11D48', tint: '#FDECEF' },
  { n: 4, key: 'nut_s4', icon: 'lightning-bolt', from: '#FB923C', to: '#EA580C', tint: '#FFF3E6' },
  { n: 5, key: 'nut_s5', icon: 'tune-variant', from: '#43B649', to: '#2E9E3E', tint: '#E8F5E9' },
] as const;

function Section({
  index,
  title,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { colors: c, isDark } = useSettings();
  const s = SECTIONS[index];
  return (
    <View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          backgroundColor: isDark ? c.cardAlt : s.tint,
        }}
      >
        <LinearGradient
          colors={[s.from, s.to]}
          style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name={s.icon} size={30} color="#FFFFFF" />
        </LinearGradient>
        <Txt bold size="large" style={{ flex: 1 }} color={isDark ? c.text : BRAND.navy}>
          {s.n}. {title}
        </Txt>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={28} color={c.text} />
      </Pressable>
      {open && <View style={{ padding: 12, gap: 10 }}>{children}</View>}
    </View>
  );
}

/** Nutrition & Wellness Plan (design): hydration, protein, BMI diet focus, meal plan, tips. */
export default function Nutrition() {
  const { t, colors: c, language, isDark } = useSettings();
  const { profile } = useData();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [pref, setPref] = useState<DietPref>('nonveg');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => (v === 'veg' || v === 'egg' || v === 'nonveg') && setPref(v))
      .catch(() => {});
  }, []);

  if (!profile) return null;

  const choosePref = (p: DietPref) => {
    setPref(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  };

  const bmi = calcBmi(profile.weight_kg, profile.height_cm);
  const cat = bmiCategory(bmi);
  const water = dailyWater(profile.weight_kg);
  const [pLo, pHi] = proteinRange(profile.weight_kg);
  const kcal = dailyCalories(profile);
  const macros = macroTargets(kcal, profile.weight_kg);
  const hint = PORTION_HINT[cat === 'under' ? 'under' : cat === 'normal' ? 'normal' : 'high'];
  const L = (x: Record<string, string>) => x[language] ?? x.en;
  const toggle = (i: number) => setOpen((o) => ({ ...o, [i]: !o[i] }));
  const navy = isDark ? c.text : BRAND.navy;

  const summaryTile = (icon: string, color: string, title: string, value: string, sub: string) => (
    <View
      style={{
        flex: 1,
        minWidth: '46%',
        alignItems: 'center',
        backgroundColor: c.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 10,
        gap: 2,
      }}
    >
      <MaterialCommunityIcons name={icon as never} size={36} color={color} />
      <Txt bold center color={navy}>
        {title}
      </Txt>
      <Txt bold size="large" center>
        {value}
      </Txt>
      <Txt muted size="small" center>
        {sub}
      </Txt>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        <AppHeader />

        <View style={{ borderRadius: 22, overflow: 'hidden' }}>
          <LinearGradient colors={isDark ? [c.cardAlt, c.card] : ['#E8F5E9', '#E3F2FD']} style={{ padding: 18 }}>
            <Row gap={10}>
              <View style={{ flex: 1 }}>
                <Txt bold style={{ fontSize: 28, lineHeight: 34 }} color={navy}>
                  {t('nutrition_title')}
                </Txt>
                <Txt muted>{t('nutrition_sub')}</Txt>
              </View>
              <Txt style={{ fontSize: 54, lineHeight: 64 }}>🥗</Txt>
            </Row>
          </LinearGradient>
        </View>

        {/* 1. Hydration & protein */}
        <Section index={0} title={t('nut_s1')} open={!!open[0]} onToggle={() => toggle(0)}>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size="hero">🥛</Txt>
              <Txt bold color={c.secondary}>
                {t('water_intake')}
              </Txt>
              <Txt bold size="large">
                {water.litres} L
              </Txt>
              <Txt muted size="small">
                {t('glasses_daily', { n: Math.ceil(water.ml / 250) })}
              </Txt>
            </View>
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: c.border }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size="hero">🥜</Txt>
              <Txt bold color={c.secondary}>
                {t('protein_target')}
              </Txt>
              <Txt bold size="large">
                {pLo} – {pHi} g
              </Txt>
              <Txt muted size="small">
                {t('protein_per_kg', { kg: profile.weight_kg })}
              </Txt>
            </View>
          </Row>
        </Section>

        {/* 2. BMI category & dietary focus */}
        <Section index={1} title={t('nut_s2')} open={!!open[1]} onToggle={() => toggle(1)}>
          {DIET_FOCUS.map((r) => {
            const mine = r.cats.includes(cat);
            return (
              <View
                key={r.range}
                style={{
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: mine ? 2 : 1,
                  borderColor: mine ? r.color : c.border,
                  backgroundColor: mine ? r.color + '1F' : undefined,
                  gap: 4,
                }}
              >
                <Row gap={8}>
                  <Icon name={r.icon} color={r.color} size={28} />
                  <Txt bold style={{ flex: 1 }}>
                    {L(r.label)} ({r.range}){mine ? `  ✅ ${t('your_range')}` : ''}
                  </Txt>
                </Row>
                <Txt>
                  <Txt bold color={c.secondary}>
                    {t('dietary_focus')}:{' '}
                  </Txt>
                  {L(r.focus)}
                </Txt>
                <Txt>
                  <Txt bold color={c.secondary}>
                    {t('portion_strategy')}:{' '}
                  </Txt>
                  {L(r.portion)}
                </Txt>
              </View>
            );
          })}
          <Txt muted size="small">
            {t('bmi_asian_note')}
          </Txt>
        </Section>

        {/* 3. Daily meal plan */}
        <Section index={2} title={t('nut_s3')} open={!!open[2]} onToggle={() => toggle(2)}>
          <Row gap={8} style={{ backgroundColor: BMI_COLORS[cat] + '1F', borderRadius: 12, padding: 10 }}>
            <Icon name="information-outline" color={BMI_COLORS[cat]} />
            <Txt style={{ flex: 1 }}>{L(hint)}</Txt>
          </Row>
          {MEAL_PLAN.map((m) => (
            <View key={m.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 10, gap: 6 }}>
              <Row gap={10}>
                <Icon name={m.icon} size={28} color={BRAND.orange} />
                <View style={{ flex: 1 }}>
                  <Txt bold>{L(m.name)}</Txt>
                  <Txt muted size="small">
                    {m.time}
                  </Txt>
                </View>
                <View style={{ backgroundColor: c.primarySoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Txt bold size="small" color={c.primary}>
                    {t('protein')} {m.protein}
                  </Txt>
                </View>
              </Row>
              {m.menu(pref).map((line) => (
                <Txt key={line.en}>• {L(line)}</Txt>
              ))}
              <View style={{ backgroundColor: isDark ? c.cardAlt : '#F0F7FF', borderRadius: 10, padding: 8, gap: 2 }}>
                {m.vitamins.map((v) => (
                  <Txt key={v.en} size="small" color={isDark ? c.text : BRAND.navy}>
                    💊 {L(v)}
                  </Txt>
                ))}
              </View>
            </View>
          ))}
        </Section>

        {/* 4. Absorption tips */}
        <Section index={3} title={t('nut_s4')} open={!!open[3]} onToggle={() => toggle(3)}>
          {ABSORPTION_TIPS.map((tip, i) => (
            <Row key={tip.en} gap={10} style={{ alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: BRAND.orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt bold size="small" color="#FFFFFF">
                  {i + 1}
                </Txt>
              </View>
              <Txt style={{ flex: 1 }}>{L(tip)}</Txt>
            </Row>
          ))}
        </Section>

        {/* 5. Customize */}
        <Section index={4} title={t('nut_s5')} open={!!open[4]} onToggle={() => toggle(4)}>
          <Txt bold>{t('food_preference')}</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <Chip label={`🥦 ${t('pref_veg')}`} selected={pref === 'veg'} onPress={() => choosePref('veg')} />
            <Chip label={`🥚 ${t('pref_egg')}`} selected={pref === 'egg'} onPress={() => choosePref('egg')} />
            <Chip label={`🍗 ${t('pref_nonveg')}`} selected={pref === 'nonveg'} onPress={() => choosePref('nonveg')} />
          </Row>
          <Txt muted size="small">
            {t('pref_note')}
          </Txt>
          <Txt bold style={{ marginTop: 6 }}>
            {t('my_daily_macros')}
          </Txt>
          <Txt>
            🔥 {macros.kcal} kcal · {t('protein')} {macros.protein} g · {t('carbs')} {macros.carbs} g · {t('fat')} {macros.fat} g
          </Txt>
          <Row gap={10} style={{ flexWrap: 'wrap', marginTop: 4 }}>
            <Chip label={`✏️ ${t('edit_profile')}`} onPress={() => router.push('/edit-profile')} />
            <Chip label={`🎯 ${t('targets')}`} onPress={() => router.push('/targets')} />
            <Chip label={`🍽️ ${t('food_title')}`} onPress={() => router.push('/food')} />
          </Row>
        </Section>

        {/* Daily summary */}
        <View style={{ gap: 10 }}>
          <Row gap={8}>
            <Icon name="chart-bar" color={BRAND.orange} size={28} />
            <Txt bold size="title" color={navy}>
              {t('my_daily_summary')}
            </Txt>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {summaryTile('water', '#1E88E5', t('water_target'), `${water.litres} L`, t('glasses_daily', { n: Math.ceil(water.ml / 250) }))}
            {summaryTile('arm-flex', '#F59E0B', t('protein_target'), `${pLo} – ${pHi} g`, t('protein_per_kg', { kg: profile.weight_kg }))}
            {summaryTile('food-apple', '#16A34A', t('calories'), `${kcal - 100} – ${kcal + 100}`, 'kcal')}
            {summaryTile('speedometer', BMI_COLORS[cat], 'BMI', bmi.toFixed(1), t(`bmi_${cat}`))}
          </View>
        </View>

        <GradientButton
          title={t('get_my_plan')}
          icon="silverware-fork-knife"
          colors={[BRAND.greenLight, BRAND.green]}
          onPress={() => {
            setOpen({ 0: true, 1: true, 2: true, 3: true, 4: true });
            scroll.current?.scrollTo({ y: 0, animated: true });
          }}
        />
        <Txt muted size="small" center>
          {t('disclaimer')}
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
