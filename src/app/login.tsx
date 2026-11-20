import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, Card, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/data/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { useSettings } from '@/theme/settings';

export default function Login() {
  const { colors: c, t } = useSettings();
  const { sendOtp, verifyOtp, signInWithGoogle, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState<'otp' | 'verify' | 'google' | null>(null);

  const run = async (kind: 'otp' | 'verify' | 'google', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert(t('error'), (e as Error).message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

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

        {!isSupabaseConfigured && (
          <Card style={{ borderColor: c.warning, backgroundColor: c.cardAlt }}>
            <Row gap={8}>
              <Icon name="alert-outline" color={c.warning} />
              <Txt style={{ flex: 1 }}>{t('supabase_missing')}</Txt>
            </Row>
          </Card>
        )}

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
                disabled={!validEmail || !isSupabaseConfigured}
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
                value={code}
                onChangeText={setCode}
                autoFocus
              />
              <Button
                title={t('verify')}
                icon="check-circle"
                disabled={code.trim().length < 6}
                loading={busy === 'verify'}
                onPress={() => run('verify', () => verifyOtp(email, code))}
              />
              <Button variant="ghost" title={t('change_email')} onPress={() => setStep('email')} />
            </>
          )}
        </Card>

        <Row gap={10} style={{ marginVertical: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          <Txt muted>{t('or')}</Txt>
          <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        </Row>

        <Button
          variant="secondary"
          icon="google"
          title={t('google_signin')}
          disabled={!isSupabaseConfigured}
          loading={busy === 'google'}
          onPress={() => run('google', signInWithGoogle)}
        />
        <Button variant="outline" icon="cellphone" title={t('use_offline')} onPress={continueAsGuest} />
        <Txt muted size="small" center>
          {t('offline_note')}
        </Txt>
      </Screen>
    </KeyboardAvoidingView>
  );
}
