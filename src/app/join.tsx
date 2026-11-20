import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';
import { PENDING_JOIN_KEY } from '@/config/app';


/**
 * Invite deep link: healthtracker://join?code=123456 (or exp://…/--/join?code=…).
 * Works before login too: the code is saved, and after login + profile setup the
 * Group tab opens with it filled in (see (tabs)/_layout.tsx).
 */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    (async () => {
      if (code && /^\d{6}$/.test(code)) await AsyncStorage.setItem(PENDING_JOIN_KEY, code).catch(() => {});
      router.replace('/');
    })();
  }, [code]);
  return <Loading />;
}
