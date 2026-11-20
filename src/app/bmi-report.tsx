import { router } from 'expo-router';

import { BmiReport } from '@/components/BmiReport';
import { Button, Screen } from '@/components/ui';
import { useData } from '@/data/store';
import { useT } from '@/theme/settings';

export default function BmiReportScreen() {
  const t = useT();
  const { profile } = useData();
  if (!profile) return null;
  return (
    <Screen>
      <BmiReport profile={profile} />
      <Button icon="scale-bathroom" title={t('update_weight')} onPress={() => router.push('/weight')} />
    </Screen>
  );
}
