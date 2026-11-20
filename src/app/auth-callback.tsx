import { router } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';

/** Landing route for the OAuth redirect; the session is exchanged in auth.tsx. */
export default function AuthCallback() {
  useEffect(() => {
    const id = setTimeout(() => router.replace('/'), 300);
    return () => clearTimeout(id);
  }, []);
  return <Loading />;
}
