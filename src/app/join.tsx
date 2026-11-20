import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui';

/** Invite deep link: healthtracker://join?code=123456 → Group tab with the code filled in. */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    router.replace({ pathname: '/group', params: code ? { code } : {} });
  }, [code]);
  return <Loading />;
}
