import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, View } from 'react-native';

import { Button, Card, Field, Row, Screen, Txt } from '@/components/ui';
import { signedPhotoUrls } from '@/data/sync';
import type { DashboardRow } from '@/features/group/api';
import { MemberCard } from '@/features/group/GroupView';
import type { TKey } from '@/i18n';
import { addDays, todayKey, weekdayIndex } from '@/lib/dates';
import { useSettings } from '@/theme/settings';
import { addShareCode, cleanCode, fetchShared, onSharedChanged, removeShared, shareErrorKey } from './api';

const NAME_KEY = 'ht:viewer-name';

/** Viewer side of share codes: people whose code I entered, with day arrows. */
export function SharedScreen({ header, edges }: { header?: ReactNode; edges?: ('top' | 'bottom' | 'left' | 'right')[] }) {
  const { t, colors: c } = useSettings();
  const [day, setDay] = useState(todayKey());
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [prevRows, setPrevRows] = useState<DashboardRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then((n) => n && setName(n))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, y] = await Promise.all([fetchShared(day), fetchShared(addDays(day, -1))]);
      setRows(d);
      setPrevRows(y);
      setPhotos(await signedPhotoUrls(d.map((r) => r.photo_path).filter((p): p is string => !!p)));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    void load();
    return onSharedChanged(() => void load());
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const add = async () => {
    setAdding(true);
    try {
      await AsyncStorage.setItem(NAME_KEY, name.trim()).catch(() => {});
      const owner = await addShareCode(code, name);
      setCode('');
      Alert.alert(t('added'), t('now_viewing', { name: owner }));
      await load();
    } catch (e) {
      const key = shareErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = (r: DashboardRow) =>
    Alert.alert(t('stop_viewing'), t('stop_viewing_confirm', { name: r.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          await removeShared(r.user_id).catch(() => {});
          void load();
        },
      },
    ]);

  const label = (key: string) =>
    key === todayKey()
      ? t('today')
      : key === addDays(todayKey(), -1)
        ? t('yesterday')
        : `${t(`wd_${weekdayIndex(key)}` as TKey)} ${Number(key.slice(8))}/${Number(key.slice(5, 7))}`;

  const isToday = day >= todayKey();

  return (
    <Screen edges={edges} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
      {header}

      <Card>
        <Txt bold size="large">
          ➕ {t('enter_share_code')}
        </Txt>
        <Txt muted size="small" style={{ marginBottom: 10 }}>
          {t('enter_share_code_hint')}
        </Txt>
        <Field
          label={t('share_code')}
          value={code}
          onChangeText={setCode}
          placeholder="K7QM-2XPA"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={11}
        />
        <Field label={t('your_name')} value={name} onChangeText={setName} placeholder={t('name_placeholder')} />
        <Button icon="account-eye" title={t('view_details')} disabled={cleanCode(code).length !== 8} loading={adding} onPress={add} />
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt muted size="small" style={{ flex: 1 }}>
          {t('pull_to_refresh')}
        </Txt>
        <Button small variant="outline" icon="refresh" title={t('refresh')} loading={refreshing} onPress={refresh} />
      </Row>

      {error && (
        <Card style={{ borderColor: c.danger }}>
          <Txt color={c.danger}>{t('group_load_error')}</Txt>
          <Txt muted size="small">
            {error}
          </Txt>
        </Card>
      )}

      {!loading && rows.length === 0 && !error ? (
        <Card style={{ alignItems: 'center' }}>
          <Txt size="hero">👀</Txt>
          <Txt muted center>
            {t('no_shared_people')}
          </Txt>
        </Card>
      ) : (
        <>
          <Row gap={10}>
            <Button small variant="outline" icon="chevron-left" title={t('prev_day')} onPress={() => setDay(addDays(day, -1))} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Txt bold size="large">
                {label(day)}
              </Txt>
              <Txt muted size="small">
                {day}
              </Txt>
            </View>
            <Button
              small
              variant="outline"
              icon="chevron-right"
              title={t('next_day')}
              disabled={isToday}
              onPress={() => setDay(addDays(day, 1))}
            />
          </Row>
          {!isToday && <Button small variant="ghost" icon="calendar-today" title={t('back_to_today')} onPress={() => setDay(todayKey())} />}
          {rows.map((r) => (
            <MemberCard
              key={r.user_id}
              dayLabel={label(day)}
              prevLabel={label(addDays(day, -1))}
              today={r}
              yesterday={prevRows.find((y) => y.user_id === r.user_id)}
              photo={r.photo_path ? photos[r.photo_path] : null}
              mine={false}
              showCheer={false}
              canRemove
              removeLabel={t('stop_viewing')}
              onRemove={() => confirmRemove(r)}
            />
          ))}
          <Txt muted size="small">
            🔒 = {t('not_shared')} · ✅ = {t('target_achieved')}
          </Txt>
        </>
      )}
    </Screen>
  );
}
