import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, RefreshControl } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Button, Card, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { BRAND } from '@/components/WelcomeArt';
import { TitleTile } from '@/components/WorkoutUi';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';
import { claimMyInvites, fetchMyRequests, myGroups, type MyGroup, type MyRequest } from './api';
import { AccessButton, CreatePanel, FindPanel, JoinPanel, MyGroupsList, PendingRequests, type AccessMode } from './GroupAccess';
import { GroupDetail } from './GroupDetail';

/**
 * "Group Access" (design): join / create / find groups and the list of my groups;
 * opening a group shows its page. Used by the Group tab and by Group Login (compact).
 */
export function GroupsScreen({
  compact = false,
  initialCode,
  header,
  edges = ['top', 'left', 'right'],
}: {
  compact?: boolean;
  initialCode?: string;
  header?: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const { t, colors: c } = useSettings();
  const { userId, guest, signOut } = useAuth();
  const { profile } = useData();
  const [groups, setGroups] = useState<MyGroup[] | undefined>(undefined);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<AccessMode>(initialCode ? 'join' : 'home');
  const [justJoined, setJustJoined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const category = profile?.goal_type === 'gain' ? 'gain' : 'loss';

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    try {
      setError(null);
      // Joined automatically if an admin added my mobile number (phone login).
      const joined = await claimMyInvites().catch(() => [] as string[]);
      if (joined.length) Alert.alert(t('joined_group_banner'), joined.join(', '));
      const [g, r] = await Promise.all([myGroups(), fetchMyRequests().catch(() => [])]);
      setGroups(g);
      setRequests(r);
    } catch (e) {
      setError(String((e as Error).message ?? e));
      setGroups((g) => g ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openGroup = (id: string, joined = false) => {
    setSelected(id);
    setJustJoined(joined ? id : null);
    setMode('home');
    void load();
  };

  const top = header ?? (
    <>
      <AppHeader onBack={selected ? () => setSelected(null) : mode !== 'home' ? () => setMode('home') : null} />
    </>
  );

  if (!userId || !isSupabaseConfigured) {
    return (
      <Screen edges={edges}>
        {top}
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
      {top}
      <Row style={{ justifyContent: 'space-between' }}>
        {group || mode !== 'home' ? (
          <Button
            small
            variant="outline"
            icon="arrow-left"
            title={t('my_groups')}
            onPress={() => {
              setSelected(null);
              setMode('home');
            }}
          />
        ) : (
          <Txt muted size="small" style={{ flex: 1 }}>
            {t('pull_to_refresh')}
          </Txt>
        )}
        <Button small variant="outline" icon="refresh" title={t('refresh')} loading={refreshing} onPress={refresh} />
      </Row>

      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Txt color={c.danger}>{t('group_load_error')}</Txt>
        </Card>
      )}

      {group ? (
        <GroupDetail
          key={group.id}
          group={group}
          refreshKey={refreshKey}
          compact={compact}
          justJoined={justJoined === group.id}
          onLeft={() => {
            setSelected(null);
            void load();
          }}
          onChanged={() => void load()}
        />
      ) : mode === 'join' ? (
        <JoinPanel initialCode={initialCode} defaultCategory={category} onRequested={() => void load()} onJoined={() => void load()} />
      ) : mode === 'create' ? (
        <CreatePanel defaultCategory={category} onCreated={(id) => openGroup(id)} />
      ) : mode === 'find' ? (
        <FindPanel defaultCategory={category} onJoined={(id) => openGroup(id, true)} />
      ) : (
        <>
          {!header && <TitleTile icon="account-group" title={t('group_access')} subtitle={t('group_access_sub')} />}
          <AccessButton
            icon="link-variant"
            title={t('join_invited_group')}
            sub={t('join_invited_sub')}
            colors={[BRAND.blueLight, BRAND.blue]}
            onPress={() => setMode('join')}
          />
          <AccessButton
            icon="account-multiple-plus"
            title={t('create_group')}
            sub={t('create_group_sub')}
            colors={[BRAND.greenLight, BRAND.green]}
            onPress={() => setMode('create')}
          />
          <AccessButton icon="earth" title={t('find_open_groups')} sub={t('find_open_sub')} colors={['#A78BFA', '#7C3AED']} onPress={() => setMode('find')} />
          <PendingRequests requests={requests} onChanged={() => void load()} />
          <MyGroupsList groups={groups} onOpen={(id) => openGroup(id)} />
        </>
      )}
    </Screen>
  );
}
