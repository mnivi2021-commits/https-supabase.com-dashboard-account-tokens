import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Chip, Field, ListItem, Row, SectionTitle, Txt } from '@/components/ui';
import type { GroupCategory } from '@/lib/types';
import { useSettings } from '@/theme/settings';
import { cancelRequest, createGroup, groupErrorKey, requestJoin, type MyRequest } from './api';

export function CategoryPicker({ value, onChange }: { value: GroupCategory; onChange: (c: GroupCategory) => void }) {
  const { t } = useSettings();
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      <Chip label={`⬇️ ${t('cat_loss')}`} selected={value === 'loss'} onPress={() => onChange('loss')} />
      <Chip label={`⬆️ ${t('cat_gain')}`} selected={value === 'gain'} onPress={() => onChange('gain')} color="#0284C7" />
    </Row>
  );
}

/** Create a new group, or ask to join one with its invite code (admin must approve). */
export function NoGroup({
  initialCode,
  defaultCategory,
  hasGroups,
  requests,
  onCreated,
  onRequested,
}: {
  initialCode?: string;
  defaultCategory: GroupCategory;
  hasGroups: boolean;
  requests: MyRequest[];
  onCreated: (groupId: string) => void;
  onRequested: () => void;
}) {
  const { t } = useSettings();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode ?? '');
  const [category, setCategory] = useState<GroupCategory>(defaultCategory);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const showError = (e: unknown) => {
    const key = groupErrorKey(e);
    Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
  };

  const join = async () => {
    setBusy('join');
    try {
      const groupName = await requestJoin(code, category);
      setCode('');
      Alert.alert(t('request_sent'), t('request_sent_body', { group: groupName }));
      onRequested();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    setBusy('create');
    try {
      const g = await createGroup(name, category);
      setName('');
      onCreated(g.id);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (r: MyRequest) => {
    await cancelRequest(r.group_id).catch(showError);
    onRequested();
  };

  return (
    <>
      {!hasGroups && (
        <Card>
          <Txt size="title" bold>
            👨‍👩‍👧‍👦 {t('family_group')}
          </Txt>
          <Txt muted style={{ marginTop: 4 }}>
            {t('group_intro')}
          </Txt>
        </Card>
      )}

      {requests.length > 0 && (
        <Card>
          <SectionTitle>⏳ {t('waiting_approval')}</SectionTitle>
          {requests.map((r) => (
            <ListItem
              key={r.group_id}
              icon="account-clock"
              title={r.group_name}
              subtitle={t('waiting_admin')}
              right={<Button small variant="ghost" title={t('cancel')} onPress={() => cancel(r)} />}
            />
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>{t('my_challenge_category')}</SectionTitle>
        <CategoryPicker value={category} onChange={setCategory} />
        <Txt muted size="small" style={{ marginTop: 8 }}>
          {t('category_note')}
        </Txt>
      </Card>

      <Card>
        <SectionTitle>{t('join_group')}</SectionTitle>
        <Field
          label={t('invite_code')}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          placeholder="123456"
        />
        <Button
          icon="account-plus"
          title={t('send_join_request')}
          disabled={code.length !== 6}
          loading={busy === 'join'}
          onPress={join}
        />
        <Txt muted size="small" style={{ marginTop: 8 }}>
          {t('join_needs_approval')}
        </Txt>
      </Card>

      <Card>
        <SectionTitle>{t('create_group')}</SectionTitle>
        <Field label={t('group_name')} value={name} onChangeText={setName} placeholder={t('group_name_placeholder')} />
        <Button variant="secondary" icon="account-group" title={t('create')} loading={busy === 'create'} onPress={create} />
      </Card>
    </>
  );
}
