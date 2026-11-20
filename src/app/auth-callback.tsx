import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { Loading } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useT } from '@/theme/settings';

/**
 * Landing route for login links (email link and Google OAuth).
 * Email links arrive as /auth-callback?code=… and are exchanged here; Google is
 * exchanged in auth.tsx, after which this screen just returns home.
 */
export default function AuthCallback() {
  const t = useT();
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();

  useEffect(() => {
    let done = false;
    (async () => {
      if (error_description) Alert.alert(t('login_failed'), String(error_description));
      if (code) {
        // Google sign-in exchanges its own code in auth.tsx; give it a moment to finish.
        await new Promise((r) => setTimeout(r, 800));
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(code));
          if (error) Alert.alert(t('login_failed'), `${error.message}\n\n${t('open_link_same_phone')}`);
        }
      }
      if (!done) router.replace('/');
    })();
    return () => {
      done = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, error_description]);

  return <Loading />;
}
