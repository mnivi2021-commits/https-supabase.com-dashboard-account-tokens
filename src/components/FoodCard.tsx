import { router } from 'expo-router';
import { View } from 'react-native';

import { useData } from '@/data/store';
import { todayKey } from '@/lib/dates';
import { MACRO_COLORS, macroTargets, mealForNow } from '@/lib/foods';
import { dailyCalories } from '@/lib/health';
import { daySummary } from '@/lib/metrics';
import { useSettings } from '@/theme/settings';
import { Button, Card, ProgressBar, Row, SectionTitle, Txt } from './ui';

/** Home card: today's calories eaten vs target, macros, quick "add food". */
export function FoodCard() {
  const { t, colors: c } = useSettings();
  const data = useData();
  const p = data.profile;
  if (!p) return null;
  const sum = daySummary(data, todayKey());
  const goal = macroTargets(dailyCalories(p), p.weight_kg);
  const left = goal.kcal - sum.kcalIn;
  const macro = (key: 'protein' | 'carbs' | 'fat', value: number, target: number) => (
    <View style={{ flex: 1, gap: 4 }}>
      <Txt size="small" bold color={MACRO_COLORS[key]}>
        {t(key)}
      </Txt>
      <ProgressBar value={(value / Math.max(1, target)) * 100} color={MACRO_COLORS[key]} height={8} />
      <Txt size="small" muted>
        {value}/{target} g
      </Txt>
    </View>
  );
  return (
    <Card>
      <SectionTitle right={<Txt bold color={left < 0 ? c.danger : c.primary}>{sum.kcalIn} / {goal.kcal} kcal</Txt>}>
        🍽️ {t('food')}
      </SectionTitle>
      <ProgressBar value={(sum.kcalIn / goal.kcal) * 100} color={left < 0 ? c.danger : c.primary} height={14} />
      <Txt muted size="small" style={{ marginTop: 6 }}>
        {left >= 0 ? t('kcal_left', { n: left }) : t('kcal_over', { n: -left })} · {t('items_n', { n: sum.foods.length })}
      </Txt>
      <Row gap={12} style={{ marginTop: 12 }}>
        {macro('protein', sum.protein, goal.protein)}
        {macro('carbs', sum.carbs, goal.carbs)}
        {macro('fat', sum.fat, goal.fat)}
      </Row>
      <Row gap={10} style={{ marginTop: 14 }}>
        <Button
          style={{ flex: 2 }}
          icon="plus"
          title={t('add_food')}
          onPress={() => router.push({ pathname: '/add-food', params: { meal: mealForNow() } })}
        />
        <Button style={{ flex: 1 }} variant="outline" icon="silverware-fork-knife" title={t('see_all')} onPress={() => router.push('/food')} />
      </Row>
      <Button
        style={{ marginTop: 10 }}
        variant="secondary"
        icon="food-apple"
        title={t('nutrition_plan_btn')}
        onPress={() => router.push('/nutrition')}
      />
    </Card>
  );
}
