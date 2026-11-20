import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Chip, Field, Row, SectionTitle, Txt } from '@/components/ui';
import type { GroupCategory } from '@/lib/types';
import { useSettings } from '@/theme/settings';
import { createGroup, groupErrorKey, joinGroup } from './api';

export function CategoryPicker({ value, onChange }: { value: GroupCategory; onChange: (c: GroupCategory) => void }) {
  const { t } = useSettings();
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      <Chip label={`⬇️ ${t('cat_loss')}`} selected={value === 'loss'} onPress={() => onChange('loss')} />
      <Chip label={`⬆️ ${t('cat_gain')}`} selected={value === 'gain'} onPress={() => onChange('gain')} color="#0284C7" />
    </Row>
  );
}

export function NoGroup({
  initialCode,
  defaultCategory,
  onDone,
}: {
  initialCode?: string;
  defaultCategory: GroupCategory;
  onDone: () => void;
}) {
  const { t } = useSettings();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode ?? '');
  const [category, setCategory] = useState<GroupCategory>(defaultCategory);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const run = async (kind: 'create' | 'join', fn: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await fn();
      onDone();
    } catch (e) {
      const key = groupErrorKey(e);
      Alert.alert(t('error'), key ? t(key) : String((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Card>
        <Txt size="title" bold>
          👨‍👩‍👧‍👦 {t('family_group')}
        </Txt>
        <Txt muted style={{ marginTop: 4 }}>
          {t('group_intro')}
        </Txt>
      </Card>

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
          title={t('join')}
          disabled={code.length !== 6}
          loading={busy === 'join'}
          onPress={() => run('join', () => joinGroup(code, category))}
        />
      </Card>

      <Card>
        <SectionTitle>{t('create_group')}</SectionTitle>
        <Field label={t('group_name')} value={name} onChangeText={setName} placeholder={t('group_name_placeholder')} />
        <Button
          variant="secondary"
          icon="account-group"
          title={t('create')}
          loading={busy === 'create'}
          onPress={() => run('create', () => createGroup(name, category))}
        />
      </Card>
    </>
  );
}
