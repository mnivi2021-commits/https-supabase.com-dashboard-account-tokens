import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const GUEST_KEY = 'ht:guest';

interface AuthValue {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  /** Offline-only mode: no account, data stays on this phone. */
  guest: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const g = (await AsyncStorage.getItem(GUEST_KEY).catch(() => null)) === '1';
      let s: Session | null = null;
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        s = data.session;
      }
      if (!mounted) return;
      setGuest(g && !s);
      setSession(s);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        setGuest(false);
        AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // The email has a code (custom template) or, on the free default sender, a link
      // that reopens the app at /auth-callback?code=… on this phone.
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth-callback') },
    });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw error;
  }, []);

  /**
   * Google sign-in through Supabase OAuth in the system browser. Works in Expo Go
   * because the redirect is an exp:// (or healthtracker://) URL that must be added
   * to Supabase → Authentication → URL Configuration → Redirect URLs.
   */
  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return false;
    const { queryParams } = Linking.parse(result.url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (!code) {
      const desc = queryParams?.error_description;
      throw new Error(typeof desc === 'string' ? desc : 'Google sign-in was cancelled');
    }
    const { error: exError } = await supabase.auth.exchangeCodeForSession(code);
    if (exError) throw exError;
    return true;
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, '1');
    setGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});
    setGuest(false);
    if (isSupabaseConfigured) await supabase.auth.signOut().catch(() => {});
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      guest,
      sendOtp,
      verifyOtp,
      signInWithGoogle,
      continueAsGuest,
      signOut,
    }),
    [loading, session, guest, sendOtp, verifyOtp, signInWithGoogle, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
