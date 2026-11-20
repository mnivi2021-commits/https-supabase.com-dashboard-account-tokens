import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, useWindowDimensions } from 'react-native';

import type { TKey } from '@/i18n';
import { parseKey, todayKey } from '@/lib/dates';
import { BMI_COLORS, bmiCategory, calcBmi, dailyCalories, dailyWater, idealWeightRange, round1, type BmiCategory } from '@/lib/health';
import type { Profile } from '@/lib/types';
import { useT, useTheme } from '@/theme/settings';
import { BmiDial } from './BmiDial';
import { Card, Icon, Row, Stat, Txt, type IconName } from './ui';

type ReportProfile = Pick<
  Profile,
  'weight_kg' | 'height_cm' | 'age' | 'gender' | 'goal_type' | 'target_weight_kg' | 'target_date' | 'name'
> & { health_issues?: string | null };

// Asian / Indian ranges (spec), shown as a table like the design.
const RANGES: { cat: BmiCategory; range: string }[] = [
  { cat: 'under', range: '< 18.5' },
  { cat: 'normal', range: '18.5 – 22.9' },
  { cat: 'over', range: '23 – 24.9' },
  { cat: 'obese', range: '≥ 25' },
];

const SOFT: Record<BmiCategory, string> = {
  under: '#DBEAFE',
  normal: '#DCFCE7',
  over: '#FFEDD5',
  obese: '#FEE2E2',
};

function Guideline({ icon, color, title, text }: { icon: IconName; color: string; title: string; text: string }) {
  const c = useTheme();
  return (
    <Row gap={12} style={{ alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1, borderColor: c.border }}>
      <Icon name={icon} size={30} color={color} />
      <View style={{ flex: 1 }}>
        <Txt bold color={c.secondary}>
          {title}
        </Txt>
        {text.split('\n').map((line) => (
          <Txt key={line}>{line}</Txt>
        ))}
      </View>
    </Row>
  );
}

/** "My Health Report": BMI dial, result, categories table, guidelines, targets. */
export function BmiReport({ profile }: { profile: ReportProfile }) {
  const c = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const bmi = calcBmi(profile.weight_kg, profile.height_cm);
  const cat = bmiCategory(bmi);
  const color = BMI_COLORS[cat];
  const [lo, hi] = idealWeightRange(profile.height_cm);
  const kcal = dailyCalories(profile);
  const water = dailyWater(profile.weight_kg);
  const tipGroup = cat === 'under' ? 'low' : cat === 'normal' ? 'normal' : 'high';
  const issue = profile.health_issues?.trim();

  const weeks = Math.max(1, (parseKey(profile.target_date).getTime() - parseKey(todayKey()).getTime()) / (7 * 86_400_000));
  const diff = round1(profile.target_weight_kg - profile.weight_kg);
  const perWeek = round1(Math.abs(diff) / weeks);
  const narrow = width < 380;

  const info = (icon: IconName, label: string, value: string) => (
    <Row gap={8} style={{ paddingVertical: 4 }}>
      <Icon name={icon} size={22} color={c.secondary} />
      <Txt>
        {label}: <Txt bold>{value}</Txt>
      </Txt>
    </Row>
  );

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={{ flexDirection: narrow ? 'column' : 'row', alignItems: 'center', gap: 14 }}>
          <BmiDial bmi={bmi} size={narrow ? 190 : 165} />
          <View style={{ flex: narrow ? undefined : 1, alignSelf: 'stretch', gap: 10 }}>
            <Row gap={8} style={{ backgroundColor: SOFT[cat], borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 }}>
              <MaterialCommunityIcons name={cat === 'normal' ? 'check-circle' : 'alert-circle'} size={24} color={color} />
              <Txt bold style={{ flex: 1 }} color="#0F241B">
                {t(`bmi_${cat}`)}
              </Txt>
            </Row>
            <View style={{ backgroundColor: c.secondarySoft, borderRadius: 16, padding: 10 }}>
              {info('scale-bathroom', t('weight'), `${profile.weight_kg} kg`)}
              {info('ruler', t('height'), `${Math.round(profile.height_cm)} cm`)}
              {info('account-outline', t('age'), `${profile.age} ${t('years')}`)}
            </View>
          </View>
        </View>
      </Card>

      <Row gap={10} style={{ backgroundColor: SOFT[cat], borderRadius: 18, padding: 14 }}>
        <MaterialCommunityIcons name={cat === 'normal' ? 'check-circle' : 'information'} size={28} color={color} />
        <Txt bold style={{ flex: 1 }} color="#0F241B">
          {t(`bmi_msg_${cat}` as TKey)}
        </Txt>
      </Row>

      <Card>
        <Txt bold size="large" color={c.secondary} style={{ marginBottom: 8 }}>
          {t('bmi_categories')}
        </Txt>
        {RANGES.map((r) => {
          const mine = r.cat === cat;
          return (
            <Row
              key={r.cat}
              gap={10}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 12,
                backgroundColor: mine ? SOFT[r.cat] : undefined,
              }}
            >
              <Txt bold style={{ width: 96 }} color={mine ? '#0F241B' : c.text}>
                {r.range}
              </Txt>
              <View style={{ flex: 1, backgroundColor: SOFT[r.cat], borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt bold={mine} color="#0F241B">
                  {t(`bmi_${r.cat}`)}
                  {mine ? `  ✅ ${t('your_range')}` : ''}
                </Txt>
              </View>
            </Row>
          );
        })}
        <Txt muted size="small" style={{ marginTop: 6 }}>
          {t('bmi_asian_note')}
        </Txt>
      </Card>

      <Card>
        <Row gap={8} style={{ marginBottom: 4 }}>
          <Icon name="speedometer" color={c.secondary} />
          <Txt bold size="large" color={c.secondary}>
            {t('health_guidelines')}
          </Txt>
        </Row>
        <Guideline icon="food-apple" color="#16A34A" title={t('diet')} text={t(`tips_${tipGroup}_diet` as TKey)} />
        <Guideline icon="run" color="#0F241B" title={t('exercise')} text={t(`tips_${tipGroup}_workout` as TKey)} />
        <Guideline icon="water" color="#0284C7" title={t('hydration')} text={t('guide_hydration', { l: water.litres })} />
        <Guideline icon="bed" color="#1565C0" title={t('sleep')} text={t('guide_sleep')} />
        <Guideline
          icon="heart-pulse"
          color="#DC2626"
          title={t('monitor')}
          text={issue ? `${t('guide_monitor')}\n${t('guide_monitor_issue', { issue })}` : t('guide_monitor')}
        />
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
          <Stat icon="cup" color={c.secondary} label={t('glasses_200')} value={`${Math.ceil(water.ml / 200)}`} />
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

      <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
        <Row gap={8}>
          <Icon name="information-outline" color={c.secondary} />
          <Txt style={{ flex: 1 }}>{t('disclaimer')}</Txt>
        </Row>
      </Card>
    </View>
  );
}
