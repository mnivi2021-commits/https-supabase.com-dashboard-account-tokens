import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, Chip, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { FOODS, MEALS, mealForNow, type FoodItem } from '@/lib/foods';
import type { Meal } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const CATEGORIES = ['all', 'tiffin', 'meal', 'curry', 'protein', 'drink', 'fruit', 'snack'] as const;
type Category = (typeof CATEGORIES)[number];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pick a food (or enter your own), choose the quantity, and add it to a meal. */
export default function AddFood() {
  const { t, colors: c, language } = useSettings();
  const { addFood } = useData();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const [meal, setMeal] = useState<Meal>(MEALS.includes(params.meal as Meal) ? (params.meal as Meal) : mealForNow());
  const date = params.date ?? todayKey();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cProtein, setCProtein] = useState('');
  const [cCarbs, setCCarbs] = useState('');
  const [cFat, setCFat] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FOODS.filter(
      (f) =>
        (category === 'all' || f.category === category) &&
        (!q || Object.values(f.name).some((n) => n.toLowerCase().includes(q))),
    );
  }, [search, category]);

  const pick = (f: FoodItem) => {
    setSelected(selected?.id === f.id ? null : f);
    setQty(1);
  };

  const addSelected = () => {
    if (!selected) return;
    addFood({
      date,
      meal,
      food_id: selected.id,
      name: selected.name[language] ?? selected.name.en,
      qty,
      serving: selected.serving,
      kcal: r1(selected.kcal * qty),
      protein: r1(selected.protein * qty),
      carbs: r1(selected.carbs * qty),
      fat: r1(selected.fat * qty),
    });
    router.back();
  };

  const n = (s: string) => Math.max(0, parseFloat(s) || 0);
  const customValid = cName.trim().length > 0 && n(cKcal) > 0;
  const addCustom = () => {
    addFood({
      date,
      meal,
      food_id: null,
      name: cName.trim(),
      qty: 1,
      serving: t('serving_custom'),
      kcal: r1(n(cKcal)),
      protein: r1(n(cProtein)),
      carbs: r1(n(cCarbs)),
      fat: r1(n(cFat)),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {MEALS.map((m) => (
            <Chip key={m} label={t(`meal_${m}` as TKey)} selected={meal === m} onPress={() => setMeal(m)} />
          ))}
        </Row>

        <Row gap={8}>
          <Chip label={t('food_list')} selected={!custom} onPress={() => setCustom(false)} />
          <Chip label={t('custom_food')} selected={custom} onPress={() => setCustom(true)} color={c.secondary} />
        </Row>

        {custom ? (
          <Card>
            <Field label={t('food_name')} value={cName} onChangeText={setCName} placeholder={t('food_name_placeholder')} />
            <Field label={t('calories_kcal')} keyboardType="numeric" value={cKcal} onChangeText={setCKcal} placeholder="250" />
            <Row gap={10}>
              <Field style={{ flex: 1 }} label={`${t('protein')} (g)`} keyboardType="numeric" value={cProtein} onChangeText={setCProtein} />
              <Field style={{ flex: 1 }} label={`${t('carbs')} (g)`} keyboardType="numeric" value={cCarbs} onChangeText={setCCarbs} />
              <Field style={{ flex: 1 }} label={`${t('fat')} (g)`} keyboardType="numeric" value={cFat} onChangeText={setCFat} />
            </Row>
            <Button icon="check-circle" title={t('add')} disabled={!customValid} onPress={addCustom} />
          </Card>
        ) : (
          <>
            <Field value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_food')}`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((k) => (
                <Chip key={k} label={t(`fcat_${k}` as TKey)} selected={category === k} onPress={() => setCategory(k)} />
              ))}
            </ScrollView>

            <Card style={{ paddingVertical: 4 }}>
              {list.length === 0 && (
                <Txt muted style={{ paddingVertical: 12 }}>
                  {t('no_food_found')}
                </Txt>
              )}
              {list.map((f) => {
                const on = selected?.id === f.id;
                return (
                  <View key={f.id} style={{ borderBottomWidth: 1, borderColor: c.border }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => pick(f)}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 }}
                    >
                      <View style={{ flex: 1 }}>
                        <Txt bold>{f.name[language] ?? f.name.en}</Txt>
                        <Txt muted size="small">
                          {f.serving} · P {f.protein} · C {f.carbs} · F {f.fat} g
                        </Txt>
                      </View>
                      <Txt bold color={c.primary}>
                        {f.kcal} kcal
                      </Txt>
                      <Icon name={on ? 'chevron-up' : 'plus-circle'} color={c.primary} />
                    </Pressable>
                    {on && (
                      <View style={{ paddingBottom: 14, gap: 10 }}>
                        <Row gap={10} style={{ justifyContent: 'center' }}>
                          <Button small variant="outline" icon="minus" title="" onPress={() => setQty(Math.max(0.5, qty - 0.5))} />
                          <View style={{ minWidth: 110, alignItems: 'center' }}>
                            <Txt size="title" bold>
                              {qty}
                            </Txt>
                            <Txt muted size="small">
                              × {f.serving}
                            </Txt>
                          </View>
                          <Button small variant="outline" icon="plus" title="" onPress={() => setQty(qty + 0.5)} />
                        </Row>
                        <Txt center>
                          🔥 {Math.round(f.kcal * qty)} kcal · P {r1(f.protein * qty)} g · C {r1(f.carbs * qty)} g · F {r1(f.fat * qty)} g
                        </Txt>
                        <Button icon="check-circle" title={`${t('add')} → ${t(`meal_${meal}` as TKey)}`} onPress={addSelected} />
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}
        <Txt muted size="small">
          {t('food_estimate_note')}
        </Txt>
      </Screen>
    </KeyboardAvoidingView>
  );
}
