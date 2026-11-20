import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { View } from 'react-native';

import type { IconName } from '@/components/ui';
import type { TKey } from '@/i18n';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import { PENDING_JOIN_KEY } from '@/config/app';

const TABS: { name: string; title: TKey; icon: IconName }[] = [
  { name: 'index', title: 'tab_home', icon: 'home-heart' },
  { name: 'workout', title: 'tab_workout', icon: 'dumbbell' },
  { name: 'sleep', title: 'tab_sleep', icon: 'sleep' },
  { name: 'reports', title: 'tab_reports', icon: 'chart-bar' },
  { name: 'group', title: 'tab_group', icon: 'account-group' },
  { name: 'profile', title: 'tab_profile', icon: 'account-circle' },
];

const BRANDED = new Set(['workout', 'group']);

export default function TabsLayout() {
  const { colors: c, t } = useSettings();

  // An invite link opened before login: continue it now.
  useEffect(() => {
    AsyncStorage.getItem(PENDING_JOIN_KEY)
      .then(async (code) => {
        if (!code) return;
        await AsyncStorage.removeItem(PENDING_JOIN_KEY);
        router.push({ pathname: '/group', params: { code } });
      })
      .catch(() => {});
  }, []);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontSize: font.large, fontWeight: '700' },
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border, height: 68, paddingTop: 6 },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            // Screens with the branded AppHeader draw their own header.
            headerShown: !BRANDED.has(tab.name),
            // Active tab: white icon on a green pill (design).
            tabBarIcon: ({ color, size, focused }) => (
              <View
                style={{
                  backgroundColor: focused ? c.primary : 'transparent',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 2,
                }}
              >
                <MaterialCommunityIcons name={tab.icon} color={focused ? '#FFFFFF' : (color as string)} size={size + 2} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
