import { router } from 'expo-router';
import { Alert, Switch, View } from 'react-native';

import { canUseAppLock } from '@/components/AppLock';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Avatar } from '@/components/pickers';
import { Button, Card, Icon, ListItem, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { SyncRefresh } from '@/components/SyncRefresh';
import { ShareCodeCard } from '@/features/share/ShareCodeCard';
import { useAuth } from '@/data/auth';
import { useData } from '@/data/store';
import { isSupabaseConfigured } from '@/lib/env';
import { BMI_COLORS, bmiCategory, calcBmi, cmToFeetInches } from '@/lib/health';
import { useSettings, type ThemeMode } from '@/theme/settings';

export default function ProfileTab() {
  const { t, colors: c, themeMode, setThemeMode, setAppMode, appLock, setAppLock } = useSettings();
  const { profile, syncing, pendingCount, lastSync, syncNow, clearLocal } = useData();
  const { email, guest, signOut, isAnonymous } = useAuth();
  if (!profile) return null;
  const p = profile;
  const bmi = calcBmi(p.weight_kg, p.height_cm);
  const cat = bmiCategory(bmi);
  const fi = cmToFeetInches(p.height_cm);

  // Guests keep their phone data: it is uploaded to the account after signing in.
  const onGuestSignIn = () => void signOut();

  const onSignOut = () =>
    Alert.alert(t('sign_out'), isAnonymous ? t('sign_out_anon_warn') : t('sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('sign_out'),
        style: 'destructive',
        onPress: async () => {
          // Sign out first so the tabs unmount before the local data is cleared.
          await signOut();
          await clearLocal();
        },
      },
    ]);

  const details: [string, string][] = [
    [t('age'), `${p.age}`],
    [t('gender'), t(p.gender)],
    [t('height'), p.height_unit === 'ft' ? `${fi.feet}′ ${fi.inches}″` : `${Math.round(p.height_cm)} cm`],
    [t('weight'), `${p.weight_kg} kg`],
    [t('blood_group'), p.blood_group],
    [t('target_weight'), `${p.target_weight_kg} kg · ${p.target_date}`],
  ];

  return (
    <Screen refreshControl={<SyncRefresh />}>
      <Card style={{ alignItems: 'center' }}>
        <Avatar uri={p.photo_uri} name={p.name} size={96} />
        <Txt size="title" bold style={{ marginTop: 8 }}>
          {p.name}
        </Txt>
        <View style={{ backgroundColor: BMI_COLORS[cat], borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, marginTop: 6 }}>
          <Txt bold color="#FFFFFF">
            BMI {bmi.toFixed(1)} · {t(`bmi_${cat}`)}
          </Txt>
        </View>
        <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
          {details.map(([k, v]) => (
            <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
              <Txt muted>{k}</Txt>
              <Txt bold>{v}</Txt>
            </Row>
          ))}
        </View>
      </Card>

      <Card>
        <ListItem icon="clipboard-pulse-outline" title={t('bmi_report')} onPress={() => router.push('/bmi-report')} />
        <ListItem icon="scale-bathroom" title={t('update_weight')} onPress={() => router.push('/weight')} />
        <ListItem icon="pencil" title={t('edit_profile')} onPress={() => router.push('/edit-profile')} />
        <ListItem icon="target" title={t('targets')} onPress={() => router.push('/targets')} />
        <ListItem icon="bell-ring" title={t('reminders')} onPress={() => router.push('/reminders')} />
        <ListItem icon="shield-lock-outline" title={t('privacy')} subtitle={t('privacy_sub')} onPress={() => router.push('/privacy')} />
        {!guest && (
          <ListItem icon="account-group" title={t('group_login')} subtitle={t('group_login_sub')} onPress={() => setAppMode('group')} />
        )}
      </Card>

      <ShareCodeCard />

      <Card>
        <SectionTitle>
          <Icon name="theme-light-dark" /> {t('appearance')}
        </SectionTitle>
        <Segmented<ThemeMode>
          options={[
            { value: 'system', label: t('auto') },
            { value: 'light', label: t('light') },
            { value: 'dark', label: t('dark') },
          ]}
          value={themeMode}
          onChange={setThemeMode}
        />
        <View style={{ height: 16 }} />
        <SectionTitle>
          <Icon name="translate" /> {t('language')}
        </SectionTitle>
        <LanguagePicker />
        <View style={{ height: 16 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt bold>🔒 {t('app_lock')}</Txt>
            <Txt muted size="small">{t('app_lock_sub')}</Txt>
          </View>
          <Switch
            value={appLock}
            accessibilityLabel={t('app_lock')}
            trackColor={{ true: c.primary }}
            onValueChange={async (on) => {
              if (on && !(await canUseAppLock())) {
                Alert.alert(t('app_lock'), t('app_lock_unavailable'));
                return;
              }
              setAppLock(on);
            }}
          />
        </Row>
      </Card>

      <Card>
        <SectionTitle>{t('account')}</SectionTitle>
        {guest ? (
          <Txt muted style={{ marginBottom: 10 }}>
            {t('guest_mode_note')}
          </Txt>
        ) : (
          <>
            <Txt style={{ marginBottom: 6 }}>{isAnonymous ? t('account_no_email') : email}</Txt>
            <Row gap={8} style={{ marginBottom: 10 }}>
              <Icon name={pendingCount ? 'cloud-off-outline' : 'cloud-check'} color={pendingCount ? c.warning : c.primary} />
              <Txt muted style={{ flex: 1 }}>
                {pendingCount ? t('pending_changes', { n: pendingCount }) : t('all_synced')}
                {lastSync ? ` · ${new Date(lastSync).toLocaleTimeString()}` : ''}
              </Txt>
            </Row>
            {isSupabaseConfigured && (
              <Button variant="outline" small icon="sync" title={t('sync_now')} loading={syncing} onPress={syncNow} style={{ marginBottom: 10 }} />
            )}
          </>
        )}
        <Button variant={guest ? 'primary' : 'danger'} icon={guest ? 'login' : 'logout'} title={guest ? t('sign_in_to_sync') : t('sign_out')} onPress={guest ? onGuestSignIn : onSignOut} />
      </Card>
    </Screen>
  );
}
