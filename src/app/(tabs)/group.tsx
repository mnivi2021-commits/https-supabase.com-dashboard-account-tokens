import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';

import { Button, Card, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { fetchMyGroup, type Group } from '@/features/group/api';
import { GroupView } from '@/features/group/GroupView';
import { NoGroup } from '@/features/group/NoGroup';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';

export default function GroupTab() {
  const { t, colors: c } = useSettings();
  const { userId, guest, signOut } = useAuth();
  const { profile } = useData();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    try {
      setError(null);
      setGroup(await fetchMyGroup());
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setGroup((g) => (g === undefined ? null : g));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  if (!userId || !isSupabaseConfigured) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <Icon name="account-group" size={64} color={c.secondary} />
          <Txt size="title" bold center>
            {t('family_group')}
          </Txt>
          <Txt center muted>
            {isSupabaseConfigured ? t('group_needs_account') : t('supabase_missing')}
          </Txt>
          {guest && isSupabaseConfigured && (
            <Button icon="login" title={t('sign_in_to_sync')} onPress={() => void signOut()} style={{ alignSelf: 'stretch' }} />
          )}
        </Card>
      </Screen>
    );
  }

  if (group === undefined) return <Loading />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Row gap={8}>
            <Icon name="cloud-off-outline" color={c.danger} />
            <Txt style={{ flex: 1 }}>{t('group_load_error')}</Txt>
          </Row>
          <Button small variant="outline" icon="refresh" title={t('retry')} onPress={refresh} style={{ marginTop: 8 }} />
        </Card>
      )}
      {group ? (
        <GroupView group={group} userId={userId} refreshKey={refreshKey} onLeft={() => setGroup(null)} />
      ) : (
        <NoGroup
          initialCode={code}
          defaultCategory={profile?.goal_type === 'gain' ? 'gain' : 'loss'}
          onDone={() => void load()}
        />
      )}
    </Screen>
  );
}
