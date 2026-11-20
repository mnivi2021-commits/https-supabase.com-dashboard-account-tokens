import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { Button, Card, Chip, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';
import { fetchMyGroups, fetchMyRequests, type Group, type MyRequest } from './api';
import { GroupView } from './GroupView';
import { NoGroup } from './NoGroup';

const ADD = '__add__';

/**
 * All my groups (Family Group 1, Family Group 2, Friends Group …) with a selector on top.
 * Used by the Group tab and by the "Group Login" home (compact = member day reports only).
 */
export function GroupsScreen({
  compact = false,
  initialCode,
  header,
  edges,
}: {
  compact?: boolean;
  initialCode?: string;
  header?: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const { t, colors: c } = useSettings();
  const { userId, guest, signOut } = useAuth();
  const { profile } = useData();
  const [groups, setGroups] = useState<Group[] | undefined>(undefined);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(
    async (select?: string) => {
      if (!userId || !isSupabaseConfigured) return;
      try {
        setError(null);
        const [g, r] = await Promise.all([fetchMyGroups(), fetchMyRequests().catch(() => [])]);
        setGroups(g);
        setRequests(r);
        setSelected((cur) => {
          if (select) return select;
          if (cur && (cur === ADD || g.some((x) => x.id === cur))) return cur;
          return g[0]?.id ?? ADD;
        });
      } catch (e) {
        setError(String((e as Error).message ?? e));
        setGroups((g) => g ?? []);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(initialCode ? ADD : undefined);
  }, [load, initialCode]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  if (!userId || !isSupabaseConfigured) {
    return (
      <Screen edges={edges}>
        {header}
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

  if (groups === undefined) return <Loading />;

  const group = groups.find((g) => g.id === selected);

  return (
    <Screen edges={edges} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {header}
      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Row gap={8}>
            <Icon name="cloud-off-outline" color={c.danger} />
            <Txt style={{ flex: 1 }}>{t('group_load_error')}</Txt>
          </Row>
          <Button small variant="outline" icon="refresh" title={t('retry')} onPress={refresh} style={{ marginTop: 8 }} />
        </Card>
      )}

      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} selected={selected === g.id} onPress={() => setSelected(g.id)} />
          ))}
          <Chip label={`＋ ${t('add_group')}`} selected={selected === ADD} onPress={() => setSelected(ADD)} color={c.secondary} />
        </ScrollView>
      )}

      {group ? (
        <GroupView
          key={group.id}
          group={group}
          userId={userId}
          refreshKey={refreshKey}
          compact={compact}
          onLeft={() => void load(ADD)}
        />
      ) : (
        <NoGroup
          initialCode={initialCode}
          defaultCategory={profile?.goal_type === 'gain' ? 'gain' : 'loss'}
          hasGroups={groups.length > 0}
          requests={requests}
          onCreated={(id) => void load(id)}
          onRequested={() => void load(ADD)}
        />
      )}
    </Screen>
  );
}
