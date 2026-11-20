import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, View } from 'react-native';

import { Button, Card, ListItem, Row, SectionTitle, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';
import { formatCode, myShareCode, myViewers, removeViewer, resetShareCode, shareErrorKey, type Viewer } from './api';

/**
 * Owner side of share codes: my code, share buttons, who can see my data.
 * `compact` (Home) shows just the code and share buttons.
 */
export function ShareCodeCard({ compact = false }: { compact?: boolean }) {
  const { t, colors: c } = useSettings();
  const { userId, guest, startAnonymous } = useAuth();
  const { syncNow } = useData();
  const [code, setCode] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      let c2: string;
      try {
        c2 = await myShareCode();
      } catch (e) {
        // Right after "Start" the profile may not be uploaded yet: sync, then retry once.
        if (shareErrorKey(e) !== 'err_no_profile_yet') throw e;
        await syncNow();
        c2 = await myShareCode();
      }
      setCode(c2);
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
        <SectionTitle>🔑 {t('my_share_code')}</SectionTitle>
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

  const pretty = code ? formatCode(code) : '';
  const message = t('share_code_message', { code: pretty, link: Linking.createURL('/') });

  const shareWhatsApp = async () => {
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    } catch {
      await Share.share({ message });
    }
  };

  const confirmReset = () =>
    Alert.alert(t('new_code'), t('new_code_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('new_code'),
        style: 'destructive',
        onPress: async () => {
          try {
            setCode(await resetShareCode());
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

  return (
    <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
      <SectionTitle>🔑 {t('my_share_code')}</SectionTitle>
      {busy && !code ? (
        <ActivityIndicator color={c.primary} />
      ) : error ? (
        <View style={{ gap: 8 }}>
          <Txt color={c.danger}>{error}</Txt>
          <Button small variant="outline" icon="refresh" title={t('retry')} onPress={load} />
        </View>
      ) : (
        <>
          <Txt size="hero" bold color={c.primary} center style={{ letterSpacing: 4 }} >
            {pretty}
          </Txt>
          <Txt muted size="small" center style={{ marginBottom: 10 }}>
            {t('share_code_hint')}
          </Txt>
          <Row gap={10}>
            <Button style={{ flex: 1, backgroundColor: '#25D366', borderColor: '#25D366' }} small icon="whatsapp" title="WhatsApp" onPress={shareWhatsApp} />
            <Button style={{ flex: 1 }} small variant="outline" icon="share-variant" title={t('share')} onPress={() => Share.share({ message })} />
          </Row>
        </>
      )}

      {!compact && code && (
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
          <Button small variant="ghost" icon="key-change" title={t('new_code')} onPress={confirmReset} style={{ marginTop: 6 }} />
        </View>
      )}
    </Card>
  );
}
