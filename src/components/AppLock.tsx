import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';

import { useAuth } from '@/data/auth';
import { useSettings } from '@/theme/settings';
import { Button, Txt } from './ui';
import { Logo, Wordmark } from './WelcomeArt';

/** Lock again after the app has been in the background this long. */
const RELOCK_AFTER_MS = 30_000;

/** True when the phone has a screen lock (PIN / pattern / fingerprint / face) we can use. */
export async function canUseAppLock(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/**
 * App lock (phone PIN / fingerprint). When turned on in Profile, the app asks for the phone's
 * own unlock when opened and after 30 seconds in the background.
 */
export function AppLock({ children }: { children: ReactNode }) {
  const { t, colors: c, appLock, ready } = useSettings();
  const { session, guest } = useAuth();
  const enabled = appLock && (!!session || guest);
  const [locked, setLocked] = useState(false);
  const wentAway = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('unlock_prompt'),
        cancelLabel: t('cancel'),
        disableDeviceFallback: false, // allow the phone PIN when fingerprint is not available
      });
      if (res.success) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, [t]);

  // Lock on start.
  useEffect(() => {
    if (ready && enabled) setLocked(true);
    if (!enabled) setLocked(false);
  }, [ready, enabled]);

  // Lock again after being away.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') wentAway.current = Date.now();
      if (s === 'active' && wentAway.current && Date.now() - wentAway.current > RELOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  if (!locked) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Logo size={120} />
      <Wordmark first="Health" second="Tracker" size={32} />
      <Txt size="large" bold center>
        🔒 {t('app_locked')}
      </Txt>
      <Button icon="fingerprint" title={t('unlock')} onPress={unlock} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
