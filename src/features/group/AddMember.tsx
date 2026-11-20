import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Contact } from 'expo-contacts';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, TextInput, View } from 'react-native';

import { Button, Card, Icon, Row, SectionTitle, Txt } from '@/components/ui';
import { BRAND } from '@/components/WelcomeArt';
import { DEFAULT_COUNTRY_CODE, DOWNLOAD_URL, joinUrl } from '@/config/app';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import {
  addGroupInvite,
  deleteGroupInvite,
  formatPhone,
  groupErrorKey,
  listGroupInvites,
  type GroupInvite,
  type MyGroup,
} from './api';

/** 10-digit Indian number (or full international number) → digits with country code. */
function toDigits(input: string): string | null {
  let d = input.replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10) d = DEFAULT_COUNTRY_CODE + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

/** Admin: add a member by name + mobile number and send a WhatsApp invite. */
export function AddMemberCard({ group, refreshKey }: { group: MyGroup; refreshKey: number }) {
  const { t, colors: c } = useSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setInvites(await listGroupInvites(group.id));
    } catch {}
  }, [group.id]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const message = (inviteName: string, digits: string) =>
    t('wa_invite_message', {
      name: inviteName || t('friend'),
      group: group.name,
      download: DOWNLOAD_URL,
      phone: formatPhone(digits),
      code: group.invite_code,
      link: joinUrl(group.invite_code),
    });

  /** Opens WhatsApp chat with that number (falls back to the share sheet). */
  const sendWhatsApp = async (inviteName: string, digits: string) => {
    const text = message(inviteName, digits);
    try {
      await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
    } catch {
      await Share.share({ message: text });
    }
  };

  const pickContact = async () => {
    try {
      const contact = await Contact.presentPicker();
      if (!contact) return;
      const [fullName, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
      if (fullName) setName(fullName);
      const first = phones.find((p) => toDigits(p.number ?? ''))?.number;
      if (first) setPhone(first);
      else Alert.alert(t('error'), t('contact_no_phone'));
    } catch (e) {
      Alert.alert(t('error'), String((e as Error).message ?? e));
    }
  };

  const add = async () => {
    const digits = toDigits(phone);
    if (!digits) {
      Alert.alert(t('error'), t('err_invalid_phone'));
      return;
    }
    setBusy(true);
    try {
      await addGroupInvite(group.id, name, digits);
      await load();
      await sendWhatsApp(name, digits);
      setName('');
      setPhone('');
    } catch (e) {
      const key = groupErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const remove = (inv: GroupInvite) =>
    Alert.alert(t('remove'), `${inv.name || formatPhone(inv.phone)}`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('remove'), style: 'destructive', onPress: () => void deleteGroupInvite(inv.id).then(load) },
    ]);

  const inputStyle = {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: font.large,
    color: c.text,
    backgroundColor: c.inputBg,
  } as const;

  return (
    <Card style={{ gap: 10 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Row gap={10}>
          <Icon name="account-plus" color={BRAND.green} size={30} />
          <View style={{ flex: 1 }}>
            <Txt bold size="large">
              {t('add_member')}
            </Txt>
            <Txt muted size="small">
              {t('add_member_sub')}
            </Txt>
          </View>
          <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={28} color={c.muted} />
        </Row>
      </Pressable>

      {open && (
        <>
          <Txt bold>{t('name')}</Txt>
          <TextInput value={name} onChangeText={setName} placeholder={t('name_placeholder')} placeholderTextColor={c.muted} style={inputStyle} />
          <Txt bold>{t('mobile_number')}</Txt>
          <Row gap={8}>
            <View style={{ ...inputStyle, justifyContent: 'center', backgroundColor: c.cardAlt }}>
              <Txt size="large">+{DEFAULT_COUNTRY_CODE}</Txt>
            </View>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="98765 43210"
              placeholderTextColor={c.muted}
              keyboardType="phone-pad"
              maxLength={16}
              style={{ ...inputStyle, flex: 1 }}
            />
          </Row>
          <Button small variant="ghost" icon="contacts" title={t('pick_from_contacts')} onPress={pickContact} />
          <Button
            icon="whatsapp"
            title={t('add_and_invite')}
            loading={busy}
            disabled={!toDigits(phone)}
            onPress={add}
            style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
          />
          <Txt muted size="small">
            {t('add_member_note')}
          </Txt>
        </>
      )}

      {invites.length > 0 && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Txt bold>{t('invited_people')}</Txt>
          {invites.map((inv) => (
            <Row key={inv.id} gap={8} style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: c.border }}>
              <View style={{ flex: 1 }}>
                <Txt bold>{inv.name || t('friend')}</Txt>
                <Txt muted size="small">
                  {formatPhone(inv.phone)}
                </Txt>
              </View>
              <View
                style={{
                  backgroundColor: inv.status === 'joined' ? c.primarySoft : '#FEF3C7',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Txt bold size="small" color={inv.status === 'joined' ? c.primary : '#92400E'}>
                  {inv.status === 'joined' ? `✅ ${t('joined')}` : `⏳ ${t('invited')}`}
                </Txt>
              </View>
              {inv.status === 'invited' && (
                <Pressable hitSlop={10} onPress={() => void sendWhatsApp(inv.name, inv.phone)} accessibilityLabel={t('resend_invite')}>
                  <MaterialCommunityIcons name="whatsapp" size={26} color="#25D366" />
                </Pressable>
              )}
              <Pressable hitSlop={10} onPress={() => remove(inv)} accessibilityLabel={t('remove')}>
                <Icon name="delete-outline" color={c.danger} />
              </Pressable>
            </Row>
          ))}
        </View>
      )}
    </Card>
  );
}
