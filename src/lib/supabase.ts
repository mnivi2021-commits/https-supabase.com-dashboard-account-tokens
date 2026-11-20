import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'https://not-configured.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'not-configured-anon-key-placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

// Refresh the session only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const AVATAR_BUCKET = 'avatars';

export function isNetworkError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
}
