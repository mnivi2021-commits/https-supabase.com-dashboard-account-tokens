import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { Button, Card, Field, Row, Txt } from '@/components/ui';
import { useSettings } from '@/theme/settings';
import { isValidPin, normalizeMemberId } from './api';

const NAME_KEY = 'ht:viewer-name';

/** "Member No + PIN + your name" form used by Group Login and the Shared screen. */
export function AddMemberForm({
  onSubmit,
  loading,
  disabled,
}: {
  onSubmit: (memberId: string, pin: string, name: string) => Promise<boolean | void>;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { t } = useSettings();
  const [memberId, setMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then((n) => n && setName(n))
      .catch(() => {});
  }, []);

  const valid = !!normalizeMemberId(memberId) && isValidPin(pin);

  const submit = async () => {
    await AsyncStorage.setItem(NAME_KEY, name.trim()).catch(() => {});
    const done = await onSubmit(memberId, pin, name);
    if (done) {
      setMemberId('');
      setPin('');
    }
  };

  return (
    <Card>
      <Txt bold size="large">
        🔑 {t('enter_member')}
      </Txt>
      <Txt muted size="small" style={{ marginBottom: 10 }}>
        {t('enter_member_hint')}
      </Txt>
      <Row gap={12}>
        <Field
          style={{ flex: 3 }}
          label={t('member_no')}
          value={memberId}
          onChangeText={setMemberId}
          placeholder="HT001"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
        />
        <Field
          style={{ flex: 2 }}
          label={t('pin')}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
          placeholder="1234"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />
      </Row>
      <Field label={t('your_name')} value={name} onChangeText={setName} placeholder={t('name_placeholder')} />
      <Button icon="account-eye" title={t('view_details')} disabled={disabled || !valid} loading={loading} onPress={submit} />
    </Card>
  );
}
