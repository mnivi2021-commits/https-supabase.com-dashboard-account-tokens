import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, View } from 'react-native';

import { Button, Card, ListItem, Row, SectionTitle, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';
import { myMemberCard, myViewers, removeViewer, resetMemberPin, shareErrorKey, type MemberCard, type Viewer } from './api';

/**
 * Owner side: my Member No (HT001) + PIN, share buttons, who can see my data.
 * `compact` (Home) shows just the number, PIN and share buttons.
 */
export function ShareCodeCard({ compact = false }: { compact?: boolean }) {
  const { t, colors: c } = useSettings();
  const { userId, guest, startAnonymous } = useAuth();
  const { syncNow } = useData();
  const [card, setCard] = useState<MemberCard | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      let mc: MemberCard;
      try {
        mc = await myMemberCard();
      } catch (e) {
        // Right after "Start" the profile may not be uploaded yet: sync, then retry once.
        if (!String((e as Error).message).includes('NO_PROFILE')) throw e;
        await syncNow();
        mc = await myMemberCard();
      }
      setCard(mc);
      if (!compact) setViewers(await myViewers());
    } catch (e) {
      const key = shareErrorKey(e);
      setError(key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, compact]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSupabaseConfigured) return null;

  // Offline (old guest) users: one tap creates a cloud account and uploads their data.
  if (!userId) {
    if (!guest) return null;
    return (
      <Card>
        <SectionTitle>🔑 {t('my_member_no')}</SectionTitle>
        <Txt muted style={{ marginBottom: 10 }}>
          {t('share_code_needs_cloud')}
        </Txt>
        <Button
          icon="cloud-upload"
          title={t('turn_on_cloud')}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await startAnonymous();
            } catch (e) {
              Alert.alert(t('error'), String((e as Error).message ?? e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
    );
  }

  const message = card
    ? t('member_share_message', { id: card.member_id, pin: card.pin, link: Linking.createURL('/') })
    : '';

  const shareWhatsApp = async () => {
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    } catch {
      await Share.share({ message });
    }
  };

  const confirmReset = () =>
    Alert.alert(t('change_pin'), t('change_pin_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('change_pin'),
        style: 'destructive',
        onPress: async () => {
          try {
            setCard(await resetMemberPin());
            setViewers([]);
          } catch (e) {
            Alert.alert(t('error'), String((e as Error).message ?? e));
          }
        },
      },
    ]);

  const confirmRemove = (v: Viewer) =>
    Alert.alert(t('remove_viewer'), t('remove_viewer_confirm', { name: v.viewer_name || t('someone') }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          await removeViewer(v.viewer_id).catch(() => {});
          setViewers((list) => list.filter((x) => x.viewer_id !== v.viewer_id));
        },
      },
    ]);

  const box = (label: string, value: string) => (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: c.card, borderRadius: 14, paddingVertical: 10 }}>
      <Txt muted size="small">
        {label}
      </Txt>
      <Txt size="title" bold color={c.primary} style={{ letterSpacing: 3 }}>
        {value}
      </Txt>
    </View>
  );

  return (
    <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
      <SectionTitle>🔑 {t('my_member_no')}</SectionTitle>
      {busy && !card ? (
        <ActivityIndicator color={c.primary} />
      ) : error ? (
        <View style={{ gap: 8 }}>
          <Txt color={c.danger}>{error}</Txt>
          <Button small variant="outline" icon="refresh" title={t('retry')} onPress={load} />
        </View>
      ) : card ? (
        <>
          <Row gap={10}>
            {box(t('member_no'), card.member_id)}
            {box(t('pin'), card.pin)}
          </Row>
          <Txt muted size="small" center style={{ marginVertical: 10 }}>
            {t('member_share_hint')}
          </Txt>
          <Row gap={10}>
            <Button
              style={{ flex: 1, backgroundColor: '#25D366', borderColor: '#25D366' }}
              small
              icon="whatsapp"
              title="WhatsApp"
              onPress={shareWhatsApp}
            />
            <Button style={{ flex: 1 }} small variant="outline" icon="share-variant" title={t('share')} onPress={() => Share.share({ message })} />
          </Row>
        </>
      ) : null}

      {!compact && card && (
        <View style={{ marginTop: 14 }}>
          <Txt bold>
            👀 {t('who_can_see')} ({viewers.length})
          </Txt>
          {viewers.length === 0 ? (
            <Txt muted size="small">
              {t('no_viewers')}
            </Txt>
          ) : (
            viewers.map((v) => (
              <ListItem
                key={v.viewer_id}
                icon="account-eye"
                title={v.viewer_name || t('someone')}
                subtitle={new Date(v.created_at).toLocaleDateString()}
                right={<Button small variant="ghost" title={t('remove')} onPress={() => confirmRemove(v)} />}
              />
            ))
          )}
          <Button small variant="ghost" icon="key-change" title={t('change_pin')} onPress={confirmReset} style={{ marginTop: 6 }} />
        </View>
      )}
    </Card>
  );
}
