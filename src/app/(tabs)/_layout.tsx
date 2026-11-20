import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import type { IconName } from '@/components/ui';
import type { TKey } from '@/i18n';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';

const TABS: { name: string; title: TKey; icon: IconName }[] = [
  { name: 'index', title: 'tab_home', icon: 'home-heart' },
  { name: 'workout', title: 'tab_workout', icon: 'dumbbell' },
  { name: 'sleep', title: 'tab_sleep', icon: 'sleep' },
  { name: 'reports', title: 'tab_reports', icon: 'chart-bar' },
  { name: 'group', title: 'tab_group', icon: 'account-group' },
  { name: 'profile', title: 'tab_profile', icon: 'account-circle' },
];

export default function TabsLayout() {
  const { colors: c, t } = useSettings();
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
            tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={tab.icon} color={color as string} size={size + 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
