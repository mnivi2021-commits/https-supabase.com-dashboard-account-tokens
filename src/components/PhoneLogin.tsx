import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { useAuth } from '@/data/auth';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import { Button, Card, Row, Txt } from './ui';
import { BRAND } from './WelcomeArt';

const COUNTRIES = [
  { code: '91', flag: '🇮🇳', name: 'India', digits: 10 },
  { code: '1', flag: '🇺🇸', name: 'USA / Canada', digits: 10 },
  { code: '44', flag: '🇬🇧', name: 'United Kingdom', digits: 10 },
  { code: '971', flag: '🇦🇪', name: 'UAE', digits: 9 },
  { code: '966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9 },
  { code: '65', flag: '🇸🇬', name: 'Singapore', digits: 8 },
  { code: '60', flag: '🇲🇾', name: 'Malaysia', digits: 9 },
  { code: '94', flag: '🇱🇰', name: 'Sri Lanka', digits: 9 },
  { code: '61', flag: '🇦🇺', name: 'Australia', digits: 9 },
];
const RESEND_SECONDS = 30;

/** Supabase returns this kind of error until an SMS provider (MSG91 / Twilio) is set up. */
function isProviderMissing(e: unknown) {
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  return m.includes('provider') || (m.includes('phone') && (m.includes('disabled') || m.includes('not enabled') || m.includes('unsupported')));
}

/** Mobile number + 6-digit OTP login (country picker, validation, 30 s resend timer). */
export function PhoneLogin() {
  const { t, colors: c } = useSettings();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [picker, setPicker] = useState(false);
  const [number, setNumber] = useState('');
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const digits = number.replace(/\D/g, '');
  const valid = digits.length === country.digits;
  const full = `+${country.code}${digits}`;

  const send = async () => {
    setBusy('send');
    try {
      await sendPhoneOtp(full);
      setStep('code');
      setCode('');
      setWait(RESEND_SECONDS);
    } catch (e) {
      Alert.alert(t('error'), isProviderMissing(e) ? t('phone_login_not_ready') : String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    try {
      await verifyPhoneOtp(full, code);
    } catch (e) {
      Alert.alert(t('error'), t('wrong_otp'));
    } finally {
      setBusy(null);
    }
  };

  const input = {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: font.title,
    color: c.text,
    backgroundColor: c.inputBg,
  } as const;

  return (
    <Card style={{ gap: 10 }}>
      <Row gap={8}>
        <MaterialCommunityIcons name="cellphone-message" size={28} color={BRAND.blue} />
        <Txt bold size="large">
          {t('login_with_mobile')}
        </Txt>
      </Row>

      {step === 'number' ? (
        <>
          <Row gap={8}>
            <Pressable
              onPress={() => setPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={t('country_code')}
              style={{ ...input, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Txt size="large">
                {country.flag} +{country.code}
              </Txt>
              <MaterialCommunityIcons name="chevron-down" size={20} color={c.muted} />
            </Pressable>
            <TextInput
              value={number}
              onChangeText={(v) => setNumber(v.replace(/\D/g, '').slice(0, country.digits))}
              placeholder={'9'.repeat(country.digits)}
              placeholderTextColor={c.muted}
              keyboardType="number-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={country.digits}
              style={{ ...input, flex: 1, letterSpacing: 1 }}
            />
          </Row>
          {digits.length > 0 && !valid && (
            <Txt size="small" color={c.danger}>
              {t('enter_n_digits', { n: country.digits })}
            </Txt>
          )}
          <Button icon="message-processing" title={t('send_otp')} disabled={!valid} loading={busy === 'send'} onPress={send} />
        </>
      ) : (
        <>
          <Txt>{t('otp_sent_to', { phone: `+${country.code} ${digits}` })}</Txt>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            placeholderTextColor={c.muted}
            keyboardType="number-pad"
            // Lets Android / iOS offer the code from the SMS automatically.
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            style={{ ...input, textAlign: 'center', letterSpacing: 12, fontSize: font.hero }}
          />
          <Button icon="check-circle" title={t('verify')} disabled={code.length !== 6} loading={busy === 'verify'} onPress={verify} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Button small variant="ghost" icon="pencil" title={t('change_number')} onPress={() => setStep('number')} />
            <Button
              small
              variant="ghost"
              icon="refresh"
              title={wait > 0 ? t('resend_in', { n: wait }) : t('resend_otp')}
              disabled={wait > 0}
              onPress={send}
            />
          </Row>
        </>
      )}

      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }} onPress={() => setPicker(false)}>
          <Pressable style={{ backgroundColor: c.card, borderRadius: 20, padding: 12, maxHeight: '75%' }}>
            <Txt bold size="large" style={{ padding: 8 }}>
              {t('country_code')}
            </Txt>
            <ScrollView>
              {COUNTRIES.map((x) => (
                <Pressable
                  key={x.code}
                  onPress={() => {
                    setCountry(x);
                    setNumber('');
                    setPicker(false);
                  }}
                  style={{
                    minHeight: 54,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: x.code === country.code ? c.primarySoft : undefined,
                  }}
                >
                  <Txt size="large">{x.flag}</Txt>
                  <View style={{ flex: 1 }}>
                    <Txt bold>{x.name}</Txt>
                  </View>
                  <Txt bold>+{x.code}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}
