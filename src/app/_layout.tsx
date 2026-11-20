import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/data/auth';
import { StepTracker } from '@/data/steps';
import { DataProvider, useData } from '@/data/store';
import { font } from '@/theme/colors';
import { SettingsProvider, useSettings } from '@/theme/settings';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <DataProvider>
            <StepTracker>
              <Gate />
            </StepTracker>
          </DataProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { colors: c, isDark, t, ready: settingsReady, appMode } = useSettings();
  const { session, guest } = useAuth();
  const { ready, profile } = useData();

  if (!settingsReady || !ready) return <Loading />;

  const signedIn = !!session || guest;
  const hasProfile = !!profile;
  // Group Login needs a real account (group data lives in the cloud).
  const groupMode = appMode === 'group' && !!session;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.card },
          headerTintColor: c.text,
          headerTitleStyle: { fontSize: font.large, fontWeight: '700' },
          contentStyle: { backgroundColor: c.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Group Login only views other people's reports, so it needs no own profile. */}
        <Stack.Protected guard={signedIn && groupMode}>
          <Stack.Screen name="group-home" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !groupMode && !hasProfile}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && hasProfile && !groupMode}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="food" options={{ title: t('food_title') }} />
          <Stack.Screen name="add-food" options={{ title: t('add_food'), presentation: 'modal' }} />
          <Stack.Screen name="bmi-report" options={{ headerShown: false }} />
          <Stack.Screen name="log-workout" options={{ title: t('log_workout'), presentation: 'modal' }} />
          <Stack.Screen name="walk" options={{ title: t('live_walk') }} />
          <Stack.Screen name="weight" options={{ title: t('update_weight') }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="targets" options={{ title: t('targets') }} />
          <Stack.Screen name="reminders" options={{ title: t('reminders') }} />
          <Stack.Screen name="privacy" options={{ title: t('privacy') }} />
          <Stack.Screen name="join" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
