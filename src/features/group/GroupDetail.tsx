import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, Switch, TextInput, View } from 'react-native';

import { Button, Card, Icon, Row, SectionTitle, Txt, type IconName } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { joinUrl } from '@/config/app';
import { useAuth } from '@/data/auth';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import {
  answerQuestion,
  askQuestion,
  deleteQuestion,
  fetchQA,
  groupErrorKey,
  meetingUrl,
  setGroupHelpline,
  setMyShareData,
  type MyGroup,
  type QAQuestion,
} from './api';
import { RewardsTab, TargetTab } from './GroupTargets';
import { GroupView } from './GroupView';

type Tab = 'members' | 'target' | 'rewards' | 'meeting' | 'help';
const TABS: { key: Tab; icon: IconName; label: 'members' | 'target' | 'rewards' | 'meeting' | 'help' }[] = [
  { key: 'members', icon: 'account-group', label: 'members' },
  { key: 'target', icon: 'bullseye-arrow', label: 'target' },
  { key: 'rewards', icon: 'gift-outline', label: 'rewards' },
  { key: 'meeting', icon: 'video', label: 'meeting' },
  { key: 'help', icon: 'headset', label: 'help' },
];

/** One group (design): header with code + Shared Data, then Members / Target / Rewards / Meeting / Help. */
export function GroupDetail({
  group,
  refreshKey,
  compact,
  justJoined,
  onLeft,
  onChanged,
}: {
  group: MyGroup;
  refreshKey: number;
  compact?: boolean;
  justJoined?: boolean;
  onLeft: () => void;
  onChanged: () => void;
}) {
  const { t, colors: c, isDark } = useSettings();
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>('members');
  const [share, setShare] = useState(group.my_share);
  const navy = isDark ? c.text : BRAND.navy;

  useEffect(() => setShare(group.my_share), [group.my_share]);

  const inviteLink = joinUrl(group.invite_code);
  const inviteText = t('invite_message', { group: group.name, code: group.invite_code, link: inviteLink });

  const copyCode = async () => {
    await Clipboard.setStringAsync(group.invite_code);
    Alert.alert(t('copied'), group.invite_code);
  };

  const shareWhatsApp = async () => {
    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteText)}`);
    } catch {
      await Share.share({ message: inviteText });
    }
  };

  const toggleShare = async (on: boolean) => {
    setShare(on);
    try {
      await setMyShareData(group.id, on);
      onChanged();
    } catch (e) {
      setShare(!on);
      Alert.alert(t('error'), String((e as Error).message ?? e));
    }
  };

  if (!userId) return null;

  return (
    <>
      {justJoined && (
        <Row gap={8} style={{ backgroundColor: c.primarySoft, borderRadius: 16, padding: 12 }}>
          <MaterialCommunityIcons name="check-circle" size={26} color={BRAND.green} />
          <Txt bold style={{ flex: 1 }}>
            {t('joined_group_banner')}
          </Txt>
        </Row>
      )}

      <Card style={{ gap: 10 }}>
        <Row gap={14}>
          <LinearGradient
            colors={group.kind === 'open' ? [BRAND.greenLight, BRAND.green] : [BRAND.blueLight, BRAND.blue]}
            style={{ width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="account-group" size={50} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size="title" bold color={navy} numberOfLines={2}>
              {group.name}
            </Txt>
            <Row gap={4}>
              <MaterialCommunityIcons name={group.kind === 'open' ? 'earth' : 'lock'} size={18} color={c.secondary} />
              <Txt muted>
                {group.kind === 'open' ? t('open_group_public') : t('invited_group_private')} · {t('members_n', { n: group.members })}
              </Txt>
            </Row>
            {group.description ? <Txt size="small">{group.description}</Txt> : null}
          </View>
        </Row>

        <Pressable
          onPress={copyCode}
          accessibilityRole="button"
          accessibilityLabel={`${t('group_code')} ${group.invite_code}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF9C3', borderRadius: 14, padding: 10 }}
        >
          <Txt color="#0F241B">{t('group_code')}:</Txt>
          <Txt bold size="large" color="#0F241B" style={{ letterSpacing: 3, flex: 1 }}>
            {group.invite_code}
          </Txt>
          <MaterialCommunityIcons name="content-copy" size={22} color={BRAND.blue} />
        </Pressable>

        <Row gap={10}>
          <Button
            style={{ flex: 1, backgroundColor: '#25D366', borderColor: '#25D366' }}
            small
            icon="whatsapp"
            title="WhatsApp"
            onPress={shareWhatsApp}
          />
          <Button style={{ flex: 1 }} small variant="outline" icon="share-variant" title={t('share')} onPress={() => Share.share({ message: inviteText })} />
        </Row>

        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt bold>
              {t('shared_data')}: <Txt bold color={share ? BRAND.green : c.danger}>{share ? t('on') : t('off')}</Txt>
            </Txt>
            <Txt muted size="small">
              {group.kind === 'open' ? t('shared_data_open_note') : t('shared_data_note')}
            </Txt>
          </View>
          <Switch value={share} onValueChange={toggleShare} trackColor={{ true: BRAND.green }} accessibilityLabel={t('shared_data')} />
        </Row>
      </Card>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {TABS.map((x) => {
          const on = tab === x.key;
          return (
            <Pressable
              key={x.key}
              onPress={() => setTab(x.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: on ? BRAND.green : c.card,
                borderWidth: 1,
                borderColor: on ? BRAND.green : c.border,
              }}
            >
              <MaterialCommunityIcons name={x.icon} size={24} color={on ? '#FFFFFF' : c.secondary} />
              <Txt size="small" bold color={on ? '#FFFFFF' : c.text} numberOfLines={1}>
                {t(x.label)}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {tab === 'members' && <GroupView group={group} userId={userId} refreshKey={refreshKey} compact={compact} onLeft={onLeft} />}
      {tab === 'target' && <TargetTab group={group} userId={userId} refreshKey={refreshKey} />}
      {tab === 'rewards' && <RewardsTab group={group} userId={userId} refreshKey={refreshKey} />}
      {tab === 'meeting' && <MeetingTab group={group} />}
      {tab === 'help' && <HelpTab group={group} userId={userId} refreshKey={refreshKey} onChanged={onChanged} />}
    </>
  );
}

function MeetingTab({ group }: { group: MyGroup }) {
  const { t, colors: c } = useSettings();
  const url = group.meeting_room ? meetingUrl(group.meeting_room) : null;
  return (
    <Card style={{ alignItems: 'center', gap: 10, backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
      <LinearGradient
        colors={[BRAND.blueLight, BRAND.blue]}
        style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
      >
        <MaterialCommunityIcons name="video" size={40} color="#FFFFFF" />
      </LinearGradient>
      <Txt bold size="title" center>
        {t('group_meeting')}
      </Txt>
      <Txt center muted>
        {t('group_meeting_sub')}
      </Txt>
      {url ? (
        <>
          <GradientButton title={t('start_meeting')} icon="video" colors={['#6366F1', '#4338CA']} onPress={() => void Linking.openURL(url)} />
          <Button
            variant="outline"
            icon="share-variant"
            title={t('share_meeting_link')}
            onPress={() => Share.share({ message: t('meeting_message', { group: group.name, link: url }) })}
          />
          <Txt muted size="small" center>
            {t('meeting_note')}
          </Txt>
        </>
      ) : (
        <Txt muted>{t('meeting_unavailable')}</Txt>
      )}
    </Card>
  );
}

function HelpTab({
  group,
  userId,
  refreshKey,
  onChanged,
}: {
  group: MyGroup;
  userId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const { t, colors: c } = useSettings();
  const [qa, setQa] = useState<QAQuestion[]>([]);
  const [question, setQuestion] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState(group.helpline ?? '');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setQa(await fetchQA(group.id));
    } catch {}
  }, [group.id]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const key = groupErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const input = (value: string, onChange: (v: string) => void, placeholder: string, multiline = false, keyboard?: 'phone-pad') => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      multiline={multiline}
      keyboardType={keyboard}
      maxLength={keyboard ? 20 : 500}
      style={{
        minHeight: multiline ? 70 : 50,
        borderWidth: 1.5,
        borderColor: c.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingTop: multiline ? 10 : 0,
        textAlignVertical: multiline ? 'top' : 'center',
        fontSize: font.body,
        color: c.text,
        backgroundColor: c.inputBg,
      }}
    />
  );

  return (
    <>
      {group.helpline ? (
        <Pressable
          onPress={() => void Linking.openURL(`tel:${group.helpline!.replace(/[^0-9+]/g, '')}`)}
          accessibilityRole="button"
          accessibilityLabel={`${t('help_line')} ${group.helpline}`}
        >
          <LinearGradient colors={[BRAND.blueLight, BRAND.blue]} style={{ borderRadius: 20, padding: 16 }}>
            <Row gap={12}>
              <MaterialCommunityIcons name="headset" size={40} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Txt bold size="large" color="#FFFFFF">
                  {t('help_line')}: {group.helpline}
                </Txt>
                <Txt color="#E3F2FD" size="small">
                  {t('help_line_sub')}
                </Txt>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="phone" size={26} color={BRAND.blue} />
              </View>
            </Row>
          </LinearGradient>
        </Pressable>
      ) : (
        <Card>
          <Txt muted>{group.is_admin ? t('help_line_add') : t('help_line_none')}</Txt>
        </Card>
      )}

      {group.is_admin && (
        <Card style={{ gap: 8 }}>
          <Txt bold>{t('help_line_set')}</Txt>
          {input(phone, setPhone, '+91 98765 43210', false, 'phone-pad')}
          <Button
            small
            icon="content-save"
            title={t('save')}
            loading={busy}
            onPress={() =>
              void run(async () => {
                await setGroupHelpline(group.id, phone);
                onChanged();
                Alert.alert(t('saved'));
              })
            }
          />
        </Card>
      )}

      <Card style={{ gap: 8, backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }}>
        <Row gap={8}>
          <Icon name="help-circle" color={BRAND.orange} size={30} />
          <Txt bold size="large" color="#0F241B">
            {t('any_doubt')}
          </Txt>
        </Row>
        {input(question, setQuestion, t('ask_placeholder'), true)}
        <Button
          icon="send"
          title={t('ask_question')}
          disabled={!question.trim()}
          loading={busy}
          onPress={() =>
            void run(async () => {
              await askQuestion(group.id, question);
              setQuestion('');
              await load();
            })
          }
        />
      </Card>

      {qa.length === 0 ? (
        <Txt muted center>
          {t('no_questions')}
        </Txt>
      ) : (
        qa.map((q) => (
          <Card key={q.id} style={{ gap: 6 }}>
            <Row gap={8}>
              <Icon name="account-question" color={BRAND.orange} />
              <Txt bold style={{ flex: 1 }}>
                {q.author}
                {q.user_id === userId ? ` (${t('you')})` : ''}
              </Txt>
              <Txt muted size="small">
                {new Date(q.created_at).toLocaleDateString()}
              </Txt>
              {(q.user_id === userId || group.is_admin) && (
                <Pressable
                  hitSlop={10}
                  accessibilityLabel={t('delete')}
                  onPress={() =>
                    Alert.alert(t('delete'), q.body, [
                      { text: t('cancel'), style: 'cancel' },
                      { text: t('delete'), style: 'destructive', onPress: () => void deleteQuestion(q.id).then(load) },
                    ])
                  }
                >
                  <Icon name="delete-outline" color={c.danger} />
                </Pressable>
              )}
            </Row>
            <Txt size="large">{q.body}</Txt>
            {q.answers.map((a) => (
              <View key={a.id} style={{ marginLeft: 18, borderLeftWidth: 3, borderColor: BRAND.green, paddingLeft: 10, paddingVertical: 4 }}>
                <Txt bold size="small" color={BRAND.green}>
                  {a.author}
                  {a.user_id === group.admin_id ? ` 👑` : ''}
                </Txt>
                <Txt>{a.body}</Txt>
              </View>
            ))}
            <Row gap={8}>
              <View style={{ flex: 1 }}>{input(replies[q.id] ?? '', (v) => setReplies((r) => ({ ...r, [q.id]: v })), t('reply_placeholder'))}</View>
              <Button
                small
                icon="reply"
                title={t('reply')}
                disabled={!(replies[q.id] ?? '').trim()}
                onPress={() =>
                  void run(async () => {
                    await answerQuestion(q.id, replies[q.id] ?? '');
                    setReplies((r) => ({ ...r, [q.id]: '' }));
                    await load();
                  })
                }
              />
            </Row>
          </Card>
        ))
      )}
    </>
  );
}
