import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, useWindowDimensions, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Field, Icon, Row, Screen, Txt, type IconName } from '@/components/ui';
import { BottomArt, BRAND, GradientButton, Logo, ReportClipboard, ReportPill, Wordmark } from '@/components/WelcomeArt';
import { useAuth } from '@/data/auth';
import { AddMemberForm } from '@/features/share/AddMemberForm';
import { addMember, emitSharedChanged, shareErrorKey } from '@/features/share/api';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings, type AppMode } from '@/theme/settings';

type Stage = 'welcome' | AppMode;

export default function Login() {
  const { colors: c, t, setAppMode, isDark } = useSettings();
  const { width } = useWindowDimensions();
  const { startAnonymous, sendOtp, verifyOtp, signInWithGoogle, continueAsGuest } = useAuth();
  const [stage, setStage] = useState<Stage>('welcome');
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState<'start' | 'view' | 'otp' | 'verify' | 'google' | null>(null);

  const showError = (e: unknown) => {
    const key = shareErrorKey(e);
    Alert.alert(t('error'), key ? t(key) : ((e as Error).message ?? String(e)));
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const choose = (mode: AppMode) => {
    setAppMode(mode);
    setStage(mode);
  };

  /** Group Login: create a no-email account in the background, then add the member. */
  const viewMember = async (memberId: string, pin: string, name: string) => {
    setBusy('view');
    try {
      await startAnonymous();
      const owner = await addMember(memberId, pin, name);
      emitSharedChanged();
      Alert.alert(t('added'), t('now_viewing', { name: owner }));
      return true;
    } catch (e) {
      showError(e);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const backBar = (title: string, icon: IconName) => (
    <Row gap={10} style={{ marginTop: 8 }}>
      <Button small variant="outline" icon="arrow-left" title={t('back')} onPress={() => setStage('welcome')} />
      <Icon name={icon} size={28} color={c.primary} />
      <Txt size="title" bold style={{ flex: 1 }}>
        {title}
      </Txt>
    </Row>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        {stage === 'welcome' && (
          <>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Logo size={118} />
              <Wordmark first="Health" second="Tracker" />
            </View>
            <LanguagePicker />

            <Row gap={8} style={{ alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 14 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? c.text : BRAND.navy, textTransform: 'uppercase' }}>
                    {t('welcome_line1')}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: BRAND.green, textTransform: 'uppercase' }}>
                    {t('welcome_line2')}
                  </Text>
                </View>
                <ReportPill label={t('analysis_report')} />
              </View>
              <ReportClipboard title={t('analysis_report')} width={width < 380 ? 104 : 124} />
            </Row>

            {!isSupabaseConfigured && (
              <Card style={{ borderColor: c.warning, backgroundColor: c.cardAlt }}>
                <Row gap={8}>
                  <Icon name="alert-outline" color={c.warning} />
                  <Txt style={{ flex: 1 }}>{t('supabase_missing')}</Txt>
                </Row>
              </Card>
            )}

            <Card style={{ gap: 14, borderRadius: 24 }}>
              <Row gap={12}>
                <View style={{ flex: 1, height: 1.5, backgroundColor: c.border }} />
                <Txt bold size="large">
                  {t('choose_login')}
                </Txt>
                <View style={{ flex: 1, height: 1.5, backgroundColor: c.border }} />
              </Row>
              <GradientButton title={t('my_login')} icon="account" colors={[BRAND.blueLight, BRAND.blue]} onPress={() => choose('me')} />
              <GradientButton
                title={t('group_login')}
                icon="account-group"
                colors={[BRAND.greenLight, BRAND.green]}
                onPress={() => choose('group')}
              />
            </Card>

            <BottomArt width={width - 32} />
          </>
        )}

        {stage === 'group' && (
          <>
            {backBar(t('group_login'), 'account-group')}
            <AddMemberForm onSubmit={viewMember} loading={busy === 'view'} disabled={!isSupabaseConfigured} />
          </>
        )}

        {stage === 'me' && (
          <>
            {backBar(t('my_login'), 'heart-pulse')}
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
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
