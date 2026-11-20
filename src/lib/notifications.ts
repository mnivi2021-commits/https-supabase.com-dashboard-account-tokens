import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { TKey } from '@/i18n';
import type { Reminder } from './types';

// Local notifications work in Expo Go (remote push does not, and is not used).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#16A34A',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const TEXT: Record<Reminder['kind'], { title: TKey; body: TKey }> = {
  workout: { title: 'notif_workout_title', body: 'notif_workout_body' },
  bedtime: { title: 'notif_bed_title', body: 'notif_bed_body' },
  weight: { title: 'notif_weight_title', body: 'notif_weight_body' },
};

/** Cancels everything and schedules the enabled reminders again. */
export async function scheduleReminders(reminders: Reminder[], t: (k: TKey) => string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const enabled = reminders.filter((r) => r.enabled);
  if (!enabled.length) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  for (const r of enabled) {
    const content = { title: t(TEXT[r.kind].title), body: t(TEXT[r.kind].body), data: { kind: r.kind } };
    const trigger: Notifications.NotificationTriggerInput =
      r.kind === 'weight'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: r.weekday ?? 1,
            hour: r.hour,
            minute: r.minute,
            channelId: CHANNEL_ID,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: r.hour,
            minute: r.minute,
            channelId: CHANNEL_ID,
          };
    await Notifications.scheduleNotificationAsync({ content, trigger });
  }
}
