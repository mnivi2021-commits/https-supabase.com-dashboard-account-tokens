import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { MeasureGuide } from '@/components/MeasureGuide';
import { Button, Card, Field, Icon, ListItem, Screen, SectionTitle, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import { BMI_COLORS, bmiCategory, calcBmi, round1 } from '@/lib/health';
import { useSettings } from '@/theme/settings';

export default function WeightScreen() {
  const { t, colors: c } = useSettings();
  const { profile, weights, logWeight } = useData();
  const { width } = useWindowDimensions();
  const [value, setValue] = useState(profile ? String(profile.weight_kg) : '');
  const kg = parseFloat(value);
  const valid = kg >= 15 && kg <= 300;
  const bmi = profile && valid ? calcBmi(kg, profile.height_cm) : 0;
  const history = weights.slice(-12);
  const recent = [...weights].reverse().slice(0, 10);

  const save = () => {
    logWeight(round1(kg));
    Alert.alert(t('saved'), `BMI ${bmi} · ${t(`bmi_${bmiCategory(bmi)}`)}`, [
      { text: t('bmi_report'), onPress: () => router.replace('/bmi-report') },
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Field label={t('todays_weight')} keyboardType="decimal-pad" value={value} onChangeText={setValue} autoFocus />
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 }}>
          <Icon name="human" color={bmi ? BMI_COLORS[bmiCategory(bmi)] : c.muted} />
          <Txt bold color={bmi ? BMI_COLORS[bmiCategory(bmi)] : c.muted}>
            {bmi ? `BMI ${bmi} · ${t(`bmi_${bmiCategory(bmi)}`)}` : '—'}
          </Txt>
        </View>
        <Button title={t('save')} icon="check-circle" disabled={!valid} onPress={save} />
      </Card>

      <MeasureGuide kind="weight" />

      {history.length > 1 && (
        <Card>
          <SectionTitle>{t('bmi_history')}</SectionTitle>
          <LineChart
            data={history.map((w) => ({ value: w.bmi, label: w.date.slice(5) }))}
            width={width - 110}
            color={c.primary}
            dataPointsColor={c.primary}
            thickness={3}
            yAxisOffset={Math.floor(Math.min(...history.map((w) => w.bmi)) - 2)}
            yAxisThickness={0}
            xAxisColor={c.border}
            rulesColor={c.border}
            yAxisTextStyle={{ color: c.muted, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: c.muted, fontSize: 10 }}
            spacing={Math.max(44, (width - 110) / history.length)}
          />
        </Card>
      )}

      <Card>
        <SectionTitle>{t('weight_history')}</SectionTitle>
        {recent.length === 0 && <Txt muted>{t('no_weight_logs')}</Txt>}
        {recent.map((w) => (
          <ListItem
            key={w.id}
            icon="scale-bathroom"
            color={BMI_COLORS[bmiCategory(w.bmi)]}
            title={`${w.weight_kg} kg`}
            subtitle={`${w.date} · BMI ${w.bmi}`}
          />
        ))}
      </Card>
    </Screen>
  );
}
