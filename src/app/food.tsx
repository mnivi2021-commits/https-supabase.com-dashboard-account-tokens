import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { SyncRefresh } from '@/components/SyncRefresh';
import { Button, Card, Icon, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { addDays, todayKey, weekdayIndex } from '@/lib/dates';
import { MACRO_COLORS, MEAL_ICONS, MEALS, macroTargets } from '@/lib/foods';
import { dailyCalories } from '@/lib/health';
import { daySummary } from '@/lib/metrics';
import type { FoodLog } from '@/lib/types';
import { useSettings } from '@/theme/settings';


/** Food & calories for one day, grouped by meal. ◀ ▶ change the day. */
export default function FoodScreen() {
  const { t, colors: c } = useSettings();
  const data = useData();
  const [day, setDay] = useState(todayKey());
  const p = data.profile;
  if (!p) return null;

  const sum = daySummary(data, day);
  const goal = macroTargets(dailyCalories(p), p.weight_kg);
  const left = goal.kcal - sum.kcalIn;
  const isToday = day >= todayKey();
  const label =
    day === todayKey()
      ? t('today')
      : day === addDays(todayKey(), -1)
        ? t('yesterday')
        : `${t(`wd_${weekdayIndex(day)}` as TKey)} ${Number(day.slice(8))}/${Number(day.slice(5, 7))}`;

  const confirmDelete = (x: FoodLog) =>
    Alert.alert(t('delete_entry'), x.name, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => data.deleteFood(x.id) },
    ]);

  const macros: { key: 'protein' | 'carbs' | 'fat'; value: number; target: number }[] = [
    { key: 'protein', value: sum.protein, target: goal.protein },
    { key: 'carbs', value: sum.carbs, target: goal.carbs },
    { key: 'fat', value: sum.fat, target: goal.fat },
  ];

  return (
    <Screen refreshControl={<SyncRefresh />}>
      <Row gap={10}>
        <Button small variant="outline" icon="chevron-left" title={t('prev_day')} onPress={() => setDay(addDays(day, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt bold size="large">
            {label}
          </Txt>
          <Txt muted size="small">
            {day}
          </Txt>
        </View>
        <Button
          small
          variant="outline"
          icon="chevron-right"
          title={t('next_day')}
          disabled={isToday}
          onPress={() => setDay(addDays(day, 1))}
        />
      </Row>

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Txt muted>{t('kcal_eaten')}</Txt>
            <Txt size="hero" bold color={left < 0 ? c.danger : c.primary}>
              {sum.kcalIn}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt muted>
              {t('target')}: {goal.kcal} kcal
            </Txt>
            <Txt bold color={left < 0 ? c.danger : c.text}>
              {left >= 0 ? t('kcal_left', { n: left }) : t('kcal_over', { n: -left })}
            </Txt>
          </View>
        </Row>
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={(sum.kcalIn / goal.kcal) * 100} color={left < 0 ? c.danger : c.primary} height={14} />
        </View>
        <View style={{ marginTop: 14, gap: 10 }}>
          {macros.map((m) => (
            <View key={m.key}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Txt bold>{t(m.key)}</Txt>
                <Txt muted>
                  {m.value} / {m.target} g
                </Txt>
              </Row>
              <ProgressBar value={(m.value / Math.max(1, m.target)) * 100} color={MACRO_COLORS[m.key]} />
            </View>
          ))}
        </View>
      </Card>

      {MEALS.map((meal) => {
        const items = sum.foods.filter((x) => x.meal === meal);
        const kcal = Math.round(items.reduce((n, x) => n + x.kcal, 0));
        return (
          <Card key={meal}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8}>
                <Icon name={MEAL_ICONS[meal]} color={c.secondary} />
                <Txt bold size="large">
                  {t(`meal_${meal}` as TKey)}
                </Txt>
              </Row>
              <Txt bold color={c.primary}>
                {kcal} kcal
              </Txt>
            </Row>
            {items.map((x) => (
              <Row key={x.id} gap={10} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border }}>
                <View style={{ flex: 1 }}>
                  <Txt bold>
                    {x.name} × {x.qty}
                  </Txt>
                  <Txt muted size="small">
                    {x.serving} · {Math.round(x.kcal)} kcal · P {Math.round(x.protein)} g · C {Math.round(x.carbs)} g · F{' '}
                    {Math.round(x.fat)} g
                  </Txt>
                </View>
                <Pressable onPress={() => confirmDelete(x)} accessibilityLabel={t('delete')} hitSlop={12}>
                  <Icon name="delete-outline" color={c.danger} />
                </Pressable>
              </Row>
            ))}
            <Button
              small
              variant="ghost"
              icon="plus"
              title={t('add_food')}
              onPress={() => router.push({ pathname: '/add-food', params: { meal, date: day } })}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            />
          </Card>
        );
      })}

      <Txt muted size="small">
        {t('food_estimate_note')}
      </Txt>
    </Screen>
  );
}
