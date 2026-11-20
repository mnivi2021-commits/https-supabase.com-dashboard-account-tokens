import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { addShareCode, cleanCode, emitSharedChanged, shareErrorKey } from '@/features/share/api';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings, type AppMode } from '@/theme/settings';

export default function Login() {
  const { colors: c, t, appMode, setAppMode } = useSettings();
  const { startAnonymous, sendOtp, verifyOtp, signInWithGoogle, continueAsGuest } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [shareCode, setShareCode] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [busy, setBusy] = useState<'start' | 'view' | 'otp' | 'verify' | 'google' | null>(null);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const key = shareErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : ((e as Error).message ?? String(e)));
    } finally {
      setBusy(null);
    }
  };

  /** Group Login: create a no-email account in the background, then add the code. */
  const viewWithCode = () =>
    run('view', async () => {
      await AsyncStorage.setItem('ht:viewer-name', viewerName.trim()).catch(() => {});
      await startAnonymous();
      const owner = await addShareCode(shareCode, viewerName);
      emitSharedChanged();
      Alert.alert(t('added'), t('now_viewing', { name: owner }));
    });

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              backgroundColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="heart-pulse" size={60} color="#FFFFFF" />
          </View>
          <Txt size="hero" bold style={{ marginTop: 12 }}>
            {t('app_name')}
          </Txt>
          <Txt muted center>
            {t('tagline')}
          </Txt>
        </View>

        <LanguagePicker />

        <Row gap={12}>
          {(
            [
              { mode: 'me', icon: 'heart-pulse', title: t('my_login'), sub: t('my_login_sub') },
              { mode: 'group', icon: 'account-group', title: t('group_login'), sub: t('group_login_sub') },
            ] as const
          ).map((o) => {
            const on = appMode === o.mode;
            return (
              <Pressable
                key={o.mode}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setAppMode(o.mode as AppMode)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 4,
                  padding: 14,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: on ? c.primary : c.border,
                  backgroundColor: on ? c.primarySoft : c.card,
                }}
              >
                <Icon name={o.icon} size={36} color={on ? c.primary : c.muted} />
                <Txt bold size="large" center>
                  {o.title}
                </Txt>
                <Txt muted size="small" center>
                  {o.sub}
                </Txt>
              </Pressable>
            );
          })}
        </Row>

        {!isSupabaseConfigured && (
          <Card style={{ borderColor: c.warning, backgroundColor: c.cardAlt }}>
            <Row gap={8}>
              <Icon name="alert-outline" color={c.warning} />
              <Txt style={{ flex: 1 }}>{t('supabase_missing')}</Txt>
            </Row>
          </Card>
        )}

        {appMode === 'group' ? (
          // ---------- Group Login: just a share code ----------
          <Card>
            <Txt bold size="large">
              🔑 {t('enter_share_code')}
            </Txt>
            <Txt muted size="small" style={{ marginBottom: 10 }}>
              {t('enter_share_code_hint')}
            </Txt>
            <Field
              label={t('share_code')}
              value={shareCode}
              onChangeText={setShareCode}
              placeholder="K7QM-2XPA"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
            />
            <Field label={t('your_name')} value={viewerName} onChangeText={setViewerName} placeholder={t('name_placeholder')} />
            <Button
              icon="account-eye"
              title={t('view_details')}
              disabled={!isSupabaseConfigured || cleanCode(shareCode).length !== 8}
              loading={busy === 'view'}
              onPress={viewWithCode}
            />
          </Card>
        ) : (
          // ---------- My Login: one tap, no email ----------
          <>
            <Card>
              <Button
                icon="play-circle"
                title={t('start_no_email')}
                disabled={!isSupabaseConfigured}
                loading={busy === 'start'}
                onPress={() => run('start', startAnonymous)}
              />
              <Txt muted size="small" center style={{ marginTop: 8 }}>
                {t('start_no_email_note')}
              </Txt>
            </Card>
            {!isSupabaseConfigured && (
              <>
                <Button variant="outline" icon="cellphone" title={t('use_offline')} onPress={continueAsGuest} />
                <Txt muted size="small" center>
                  {t('offline_note')}
                </Txt>
              </>
            )}
          </>
        )}

        {/* Email / Google: optional, to use the same account on another phone. */}
        {isSupabaseConfigured && (
          <>
            <Button
              variant="ghost"
              icon={showEmail ? 'chevron-up' : 'email-outline'}
              title={t('use_email_instead')}
              onPress={() => setShowEmail(!showEmail)}
            />
            {showEmail && (
              <Card>
                {step === 'email' ? (
                  <>
                    <Field
                      label={t('email')}
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <Button
                      title={t('send_code')}
                      icon="email-outline"
                      disabled={!validEmail}
                      loading={busy === 'otp'}
                      onPress={() =>
                        run('otp', async () => {
                          await sendOtp(email);
                          setStep('code');
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <Txt style={{ marginBottom: 10 }}>{t('code_sent', { email: email.trim() })}</Txt>
                    <Field
                      label={t('enter_code')}
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={8}
                      value={otp}
                      onChangeText={setOtp}
                    />
                    <Button
                      title={t('verify')}
                      icon="check-circle"
                      disabled={otp.trim().length < 6}
                      loading={busy === 'verify'}
                      onPress={() => run('verify', () => verifyOtp(email, otp))}
                    />
                    <Button variant="ghost" title={t('change_email')} onPress={() => setStep('email')} />
                  </>
                )}
                <Button
                  style={{ marginTop: 10 }}
                  variant="secondary"
                  icon="google"
                  title={t('google_signin')}
                  loading={busy === 'google'}
                  onPress={() => run('google', signInWithGoogle)}
                />
              </Card>
            )}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
