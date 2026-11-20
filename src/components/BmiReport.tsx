import { View } from 'react-native';

import type { TKey } from '@/i18n';
import { parseKey, todayKey } from '@/lib/dates';
import { BMI_COLORS, bmiCategory, calcBmi, dailyCalories, dailyWater, idealWeightRange, round1 } from '@/lib/health';
import type { Profile } from '@/lib/types';
import { useT, useTheme } from '@/theme/settings';
import { BmiGauge } from './BmiGauge';
import { Card, Icon, Row, Stat, Txt, type IconName } from './ui';

type ReportProfile = Pick<
  Profile,
  'weight_kg' | 'height_cm' | 'age' | 'gender' | 'goal_type' | 'target_weight_kg' | 'target_date' | 'name'
>;

function TipList({ title, icon, text, color }: { title: string; icon: IconName; text: string; color: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Row gap={8} style={{ marginBottom: 4 }}>
        <Icon name={icon} color={color} />
        <Txt bold>{title}</Txt>
      </Row>
      {text.split('\n').map((line) => (
        <Txt key={line} style={{ marginLeft: 6, marginBottom: 2 }}>
          • {line}
        </Txt>
      ))}
    </View>
  );
}

export function BmiReport({ profile }: { profile: ReportProfile }) {
  const c = useTheme();
  const t = useT();
  const bmi = calcBmi(profile.weight_kg, profile.height_cm);
  const cat = bmiCategory(bmi);
  const color = BMI_COLORS[cat];
  const [lo, hi] = idealWeightRange(profile.height_cm);
  const kcal = dailyCalories(profile);
  const water = dailyWater(profile.weight_kg);
  const tipGroup = cat === 'under' ? 'low' : cat === 'normal' ? 'normal' : 'high';

  const weeks = Math.max(1, (parseKey(profile.target_date).getTime() - parseKey(todayKey()).getTime()) / (7 * 86_400_000));
  const diff = round1(profile.target_weight_kg - profile.weight_kg);
  const perWeek = round1(Math.abs(diff) / weeks);

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ alignItems: 'center' }}>
        <Txt muted>{t('bmi_your')}</Txt>
        <Txt size="hero" bold color={color}>
          {bmi.toFixed(1)}
        </Txt>
        <View style={{ backgroundColor: color, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12 }}>
          <Txt bold color="#FFFFFF">
            {t(`bmi_${cat}`)}
          </Txt>
        </View>
        <View style={{ alignSelf: 'stretch' }}>
          <BmiGauge bmi={bmi} />
        </View>
        <Txt muted size="small" center style={{ marginTop: 8 }}>
          {t('bmi_asian_note')}
        </Txt>
      </Card>

      <Card>
        <Txt bold size="large">
          {t('ideal_weight')}
        </Txt>
        <Txt size="title" bold color={c.primary}>
          {lo} – {hi} kg
        </Txt>
        <Txt muted>{t('ideal_weight_for', { cm: Math.round(profile.height_cm) })}</Txt>
      </Card>

      <Card>
        <Row>
          <Stat icon="fire" color="#F97316" label={t('daily_calories')} value={`${kcal} kcal`} />
          <Stat icon="cup-water" color={c.secondary} label={t('daily_water')} value={`${water.litres} L`} />
          <Stat icon="cup" color={c.secondary} label={t('glasses')} value={`${water.glasses}`} />
        </Row>
      </Card>

      {profile.goal_type !== 'maintain' && (
        <Card>
          <Txt bold size="large">
            {t('your_target')}
          </Txt>
          <Txt>
            {t('target_summary', {
              target: profile.target_weight_kg,
              date: profile.target_date,
              diff: Math.abs(diff),
              dir: t(diff < 0 ? 'to_lose' : 'to_gain'),
            })}
          </Txt>
          <Txt bold color={perWeek > 1 ? c.danger : c.primary} style={{ marginTop: 6 }}>
            {t('per_week', { kg: perWeek })}
            {perWeek > 1 ? `  ⚠️ ${t('too_fast')}` : ''}
          </Txt>
        </Card>
      )}

      <Card>
        <Txt bold size="large">
          {t('solutions')}
        </Txt>
        <TipList title={t('diet')} icon="food-apple" color="#16A34A" text={t(`tips_${tipGroup}_diet` as TKey)} />
        <TipList title={t('exercise')} icon="dumbbell" color="#0284C7" text={t(`tips_${tipGroup}_workout` as TKey)} />
        <TipList title={t('lifestyle')} icon="sleep" color="#9333EA" text={t(`tips_${tipGroup}_life` as TKey)} />
      </Card>

      <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
        <Row gap={8}>
          <Icon name="information-outline" color={c.secondary} />
          <Txt style={{ flex: 1 }}>{t('disclaimer')}</Txt>
        </Row>
      </Card>
    </View>
  );
}
