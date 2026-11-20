import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Icon, Row, Segmented, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { GroupsScreen } from '@/features/group/GroupsScreen';
import { SharedScreen } from '@/features/share/SharedScreen';
import { useSettings } from '@/theme/settings';

/** "Group Login" home: people who shared their code with me, and my groups. */
export default function GroupHome() {
  const { t, colors: c, setAppMode } = useSettings();
  const { signOut, isAnonymous } = useAuth();
  const { clearLocal } = useData();
  const [view, setView] = useState<'shared' | 'groups'>('shared');

  const onSignOut = () =>
    Alert.alert(t('sign_out'), isAnonymous ? t('sign_out_anon_warn') : t('sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('sign_out'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          await clearLocal();
        },
      },
    ]);

  const header = (
    <View style={{ gap: 10 }}>
      <Row gap={10}>
        <Icon name="account-group" size={34} color={c.primary} />
        <View style={{ flex: 1 }}>
          <Txt size="title" bold>
            {t('group_login')}
          </Txt>
          <Txt muted size="small">
            {t('group_login_sub')}
          </Txt>
        </View>
      </Row>
      <Row gap={10}>
        <Button style={{ flex: 1 }} small variant="outline" icon="arrow-left" title={t('my_health')} onPress={() => setAppMode('me')} />
        <Button style={{ flex: 1 }} small variant="ghost" icon="logout" title={t('sign_out')} onPress={onSignOut} />
      </Row>
      <Segmented
        options={[
          { value: 'shared', label: t('shared_with_me') },
          { value: 'groups', label: t('my_groups') },
        ]}
        value={view}
        onChange={setView}
      />
    </View>
  );

  return view === 'shared' ? (
    <SharedScreen header={header} edges={['top', 'left', 'right']} />
  ) : (
    <GroupsScreen compact header={header} edges={['top', 'left', 'right']} />
  );
}
