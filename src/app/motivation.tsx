import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Card, Icon, Row, Screen, Txt } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { useData } from '@/data/store';
import { todaysPush, todaysQuote } from '@/lib/dailyPush';
import { todayKey } from '@/lib/dates';
import { workoutMeta } from '@/lib/health';
import { useSettings } from '@/theme/settings';

/** "Daily Motivation" (design): quote of the day + today's fitness push challenge. */
export default function Motivation() {
  const { t, colors: c, language, isDark } = useSettings();
  const { workouts } = useData();
  const push = todaysPush();
  const quote = todaysQuote();
  const meta = workoutMeta(push.type);
  const done = workouts.some((w) => w.date === todayKey() && w.type === push.type);
  const navy = isDark ? c.text : BRAND.navy;

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader />

      <Row gap={10}>
        <LinearGradient
          colors={[BRAND.greenLight, BRAND.green]}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="format-quote-open" size={30} color="#FFFFFF" />
        </LinearGradient>
        <Txt size="title" bold color={navy}>
          {t('daily_motivation')}
        </Txt>
      </Row>

      <Card style={{ backgroundColor: isDark ? c.cardAlt : '#F7FFF5', borderColor: c.primary, paddingVertical: 24 }}>
        <Txt style={{ fontSize: 26, lineHeight: 36, fontStyle: 'italic', fontFamily: 'serif' }} center color={navy}>
          “{quote[language] ?? quote.en}”
        </Txt>
        <View style={{ height: 4, width: 120, backgroundColor: BRAND.orange, borderRadius: 2, alignSelf: 'center', marginTop: 12 }} />
      </Card>

      <Row gap={10}>
        <LinearGradient
          colors={[BRAND.greenLight, BRAND.green]}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialCommunityIcons name="dumbbell" size={28} color="#FFFFFF" />
        </LinearGradient>
        <Txt size="title" bold color={navy}>
          {t('todays_fitness_push')}
        </Txt>
      </Row>

      <Card style={{ gap: 12 }}>
        <Row gap={12}>
          <View style={{ backgroundColor: meta.color + '22', borderRadius: 20, padding: 14 }}>
            <Icon name={meta.icon} size={52} color={meta.color} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt bold size="title" color={navy}>
              {push.title[language] ?? push.title.en}
            </Txt>
            <LinearGradient colors={['#EC4899', '#BE185D']} style={{ borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Txt bold size="large" color="#FFFFFF" center>
                💪 {push.task[language] ?? push.task.en}
              </Txt>
            </LinearGradient>
          </View>
        </Row>
        {push.benefits.map((b) => (
          <Row key={b.en} gap={8}>
            <MaterialCommunityIcons name="check-circle" size={22} color={BRAND.green} />
            <Txt style={{ flex: 1 }}>{b[language] ?? b.en}</Txt>
          </Row>
        ))}
        {done && (
          <Txt bold center color={BRAND.green}>
            ✅ {t('push_done_today')}
          </Txt>
        )}
      </Card>

      <GradientButton
        title={t('lets_do_it_now')}
        icon="play-circle"
        colors={[BRAND.greenLight, BRAND.green]}
        onPress={() => router.push({ pathname: '/log-workout', params: { type: push.type } })}
      />

      <Card style={{ backgroundColor: isDark ? c.cardAlt : '#ECFDF5', borderColor: c.primary, alignItems: 'center', gap: 6 }}>
        <Txt bold size="large" center color={BRAND.green} style={{ fontStyle: 'italic' }}>
          “{t('small_efforts_quote')}”
        </Txt>
        <Txt bold style={{ fontSize: 30, lineHeight: 38, fontStyle: 'italic' }} color="#BE185D">
          {t('thank_you')} 💚
        </Txt>
        <Txt center muted>
          {t('thank_you_sub')}
        </Txt>
      </Card>
    </Screen>
  );
}
