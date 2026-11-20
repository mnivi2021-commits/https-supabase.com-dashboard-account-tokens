import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button, Card, Icon, ListItem, Row, SectionTitle, Txt, type IconName } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import type { GroupCategory } from '@/lib/types';
import { font } from '@/theme/colors';
import { useSettings } from '@/theme/settings';
import {
  cancelRequest,
  createGroupV2,
  groupErrorKey,
  joinOpenGroup,
  listOpenGroups,
  requestJoin,
  type GroupKind,
  type MyGroup,
  type MyRequest,
  type OpenGroup,
} from './api';
import { CategoryPicker } from './NoGroup';

export type AccessMode = 'home' | 'join' | 'create' | 'find';

function useShowError() {
  const { t } = useSettings();
  return (e: unknown) => {
    const key = groupErrorKey(e);
    Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
  };
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { colors: c } = useSettings();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          minHeight: 52,
          borderWidth: 1.5,
          borderColor: c.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          fontSize: font.large,
          color: c.text,
          backgroundColor: c.inputBg,
        },
        props.style,
      ]}
    />
  );
}

/** Big gradient choice from the design ("Join Invited Group", "Create Open Group"). */
export function AccessButton({
  icon,
  title,
  sub,
  colors,
  onPress,
}: {
  icon: IconName;
  title: string;
  sub: string;
  colors: [string, string];
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16 }}>
        <Row gap={14}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={icon} size={32} color={colors[1]} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt bold size="large" color="#FFFFFF">
              {title}
            </Txt>
            <Txt color="#F1F5F9">{sub}</Txt>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={32} color="#FFFFFF" />
        </Row>
      </LinearGradient>
    </Pressable>
  );
}

/** Enter a 6-digit invite code. Private group → request; open group → joined straight away. */
export function JoinPanel({
  initialCode,
  defaultCategory,
  onRequested,
  onJoined,
}: {
  initialCode?: string;
  defaultCategory: GroupCategory;
  onRequested: () => void;
  onJoined: () => void;
}) {
  const { t } = useSettings();
  const showError = useShowError();
  const [code, setCode] = useState(initialCode ?? '');
  const [category, setCategory] = useState<GroupCategory>(defaultCategory);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const join = async () => {
    setBusy(true);
    try {
      const res = await requestJoin(code, category);
      setCode('');
      if (res.startsWith('JOINED:')) {
        onJoined();
      } else {
        Alert.alert(t('request_sent'), t('request_sent_body', { group: res }));
        onRequested();
      }
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle>
        <Icon name="link-variant" color={BRAND.blue} /> {t('join_invited_group')}
      </SectionTitle>
      <Txt bold>{t('invite_code')}</Txt>
      <Input value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} placeholder="123456" />
      <Txt bold>{t('my_challenge_category')}</Txt>
      <CategoryPicker value={category} onChange={setCategory} />
      <Button icon="account-plus" title={t('send_join_request')} disabled={code.length !== 6} loading={busy} onPress={join} />
      <Txt muted size="small">
        {t('join_needs_approval')}
      </Txt>
    </Card>
  );
}

function OptionCard({
  selected,
  onPress,
  icon,
  title,
  sub,
  points,
  color,
}: {
  selected: boolean;
  onPress: () => void;
  icon: IconName;
  title: string;
  sub: string;
  points: string[];
  color: string;
}) {
  const { colors: c } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        borderRadius: 18,
        borderWidth: selected ? 2.5 : 1,
        borderColor: selected ? color : c.border,
        backgroundColor: selected ? color + '14' : c.card,
        padding: 14,
        gap: 6,
      }}
    >
      <Row gap={10}>
        <Icon name={icon} size={36} color={color} />
        <View style={{ flex: 1 }}>
          <Txt bold size="large" color={color}>
            {title}
          </Txt>
          <Txt muted>{sub}</Txt>
        </View>
        <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={28} color={selected ? color : c.muted} />
      </Row>
      {points.map((p) => (
        <Row key={p} gap={8}>
          <MaterialCommunityIcons name="check-circle" size={20} color={BRAND.green} />
          <Txt style={{ flex: 1 }}>{p}</Txt>
        </Row>
      ))}
    </Pressable>
  );
}

/** "Group Access Options": Invited (Private) vs Open (Public), then name and create. */
export function CreatePanel({ defaultCategory, onCreated }: { defaultCategory: GroupCategory; onCreated: (id: string) => void }) {
  const { t } = useSettings();
  const showError = useShowError();
  const [kind, setKind] = useState<GroupKind>('private');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>(defaultCategory);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const g = await createGroupV2(name, category, kind, description);
      onCreated(g.id);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Txt bold size="title">
        {t('group_access_options')}
      </Txt>
      <OptionCard
        selected={kind === 'private'}
        onPress={() => setKind('private')}
        icon="account-lock"
        title={t('invited_group')}
        sub={t('private')}
        color={BRAND.blue}
        points={[t('private_p1'), t('private_p2'), t('private_p3'), t('private_p4')]}
      />
      <OptionCard
        selected={kind === 'open'}
        onPress={() => setKind('open')}
        icon="earth"
        title={t('open_group')}
        sub={t('public')}
        color={BRAND.green}
        points={[t('open_p1'), t('open_p2'), t('open_p3'), t('open_p4')]}
      />
      <Card style={{ gap: 10 }}>
        <Txt bold>{t('group_name')}</Txt>
        <Input value={name} onChangeText={setName} placeholder={t('group_name_placeholder')} maxLength={40} />
        {kind === 'open' && (
          <>
            <Txt bold>{t('group_description')}</Txt>
            <Input value={description} onChangeText={setDescription} placeholder={t('group_description_placeholder')} maxLength={200} />
          </>
        )}
        <Txt bold>{t('my_challenge_category')}</Txt>
        <CategoryPicker value={category} onChange={setCategory} />
      </Card>
      <GradientButton title={busy ? '…' : t('continue')} icon="check-circle" colors={[BRAND.greenLight, BRAND.green]} onPress={create} />
    </View>
  );
}

/** Search open groups and join directly. */
export function FindPanel({ defaultCategory, onJoined }: { defaultCategory: GroupCategory; onJoined: (id: string) => void }) {
  const { t, colors: c } = useSettings();
  const showError = useShowError();
  const [search, setSearch] = useState('');
  const [list, setList] = useState<OpenGroup[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      listOpenGroups(search)
        .then(setList)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const join = async (g: OpenGroup) => {
    setBusy(g.id);
    try {
      await joinOpenGroup(g.id, defaultCategory);
      onJoined(g.id);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle>
        <Icon name="earth" color={BRAND.green} /> {t('find_open_groups')}
      </SectionTitle>
      <Input value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_groups')}`} />
      <Txt muted size="small">
        {t('open_limited_note')}
      </Txt>
      {list.length === 0 ? (
        <Txt muted>{t('no_open_groups')}</Txt>
      ) : (
        list.map((g) => (
          <Row key={g.id} gap={10} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border }}>
            <Icon name="account-group" color={BRAND.green} size={30} />
            <View style={{ flex: 1 }}>
              <Txt bold>{g.name}</Txt>
              <Txt muted size="small">
                {t('members_n', { n: g.members })}
                {g.description ? ` · ${g.description}` : ''}
              </Txt>
            </View>
            {g.is_member ? (
              <Txt bold color={BRAND.green}>
                ✓
              </Txt>
            ) : (
              <Button small title={t('join')} loading={busy === g.id} onPress={() => join(g)} />
            )}
          </Row>
        ))
      )}
    </Card>
  );
}

/** "My Groups" list with type, member count and my role. */
export function MyGroupsList({ groups, onOpen }: { groups: MyGroup[]; onOpen: (id: string) => void }) {
  const { t, colors: c, isDark } = useSettings();
  if (!groups.length) return null;
  return (
    <Card style={{ gap: 8 }}>
      <SectionTitle>
        <Icon name="account-group" color={BRAND.blue} /> {t('my_groups')}
      </SectionTitle>
      {groups.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => onOpen(g.id)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: isDark ? c.cardAlt : '#FFFFFF',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <LinearGradient
            colors={g.kind === 'open' ? [BRAND.greenLight, BRAND.green] : [BRAND.blueLight, BRAND.blue]}
            style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}
          >
            <MaterialCommunityIcons name="account-group" size={30} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold size="large" numberOfLines={1}>
              {g.name}
            </Txt>
            <Txt muted size="small">
              {g.kind === 'open' ? t('open_group') : t('invited_group')} · {t('members_n', { n: g.members })}
            </Txt>
            <View style={{ alignSelf: 'flex-start', backgroundColor: c.primarySoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Txt bold size="small" color={c.primary}>
                {t('my_role')}: {g.is_admin ? t('admin') : t('member')}
              </Txt>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color={c.muted} />
        </Pressable>
      ))}
    </Card>
  );
}

export function PendingRequests({ requests, onChanged }: { requests: MyRequest[]; onChanged: () => void }) {
  const { t } = useSettings();
  if (!requests.length) return null;
  return (
    <Card>
      <SectionTitle>⏳ {t('waiting_approval')}</SectionTitle>
      {requests.map((r) => (
        <ListItem
          key={r.group_id}
          icon="account-clock"
          title={r.group_name}
          subtitle={t('waiting_admin')}
          right={<Button small variant="ghost" title={t('cancel')} onPress={() => void cancelRequest(r.group_id).finally(onChanged)} />}
        />
      ))}
    </Card>
  );
}

