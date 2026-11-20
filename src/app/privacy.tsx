import { router } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { Button, Card, Row, Screen, Txt } from '@/components/ui';
import { useData } from '@/data/store';
import type { TKey } from '@/i18n';
import type { ShareSettings } from '@/lib/types';
import { useSettings } from '@/theme/settings';

const ITEMS: { key: keyof ShareSettings; label: TKey; emoji: string }[] = [
  { key: 'photo', label: 'share_photo', emoji: '📷' },
  { key: 'weight', label: 'share_weight', emoji: '⚖️' },
  { key: 'bmi', label: 'share_bmi', emoji: '📊' },
  { key: 'workouts', label: 'share_workouts', emoji: '🏃' },
  { key: 'steps', label: 'share_steps', emoji: '👟' },
  { key: 'sleep', label: 'share_sleep', emoji: '😴' },
];

export default function Privacy() {
  const { t, colors: c } = useSettings();
  const { profile, saveProfile } = useData();
  const [share, setShare] = useState<ShareSettings>(profile!.share);

  const save = () => {
    saveProfile({ ...profile!, share });
    router.back();
  };

  return (
    <Screen>
      <Txt muted>{t('privacy_intro')}</Txt>
      <Card>
        {ITEMS.map((it) => (
          <Row key={it.key} style={{ justifyContent: 'space-between', paddingVertical: 10 }}>
            <Txt style={{ flex: 1 }}>
              {it.emoji} {t(it.label)}
            </Txt>
            <Switch
              value={share[it.key]}
              onValueChange={(v) => setShare({ ...share, [it.key]: v })}
              trackColor={{ true: c.primary }}
              accessibilityLabel={t(it.label)}
            />
          </Row>
        ))}
      </Card>
      <Txt muted size="small">
        {t('privacy_challenge_note')}
      </Txt>
      <Button title={t('save')} icon="check-circle" onPress={save} />
    </Screen>
  );
}
