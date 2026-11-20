import { router } from 'expo-router';

import { AppHeader, WaveBanner } from '@/components/AppHeader';
import { BmiReport } from '@/components/BmiReport';
import { Button, Row, Screen } from '@/components/ui';
import { useData } from '@/data/store';
import { useT } from '@/theme/settings';

/** "My Health Report" — BMI result and health guidance. */
export default function BmiReportScreen() {
  const t = useT();
  const { profile } = useData();
  if (!profile) return null;
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader />
      <WaveBanner title={t('my_health_report')} subtitle={t('my_health_report_sub')} icon="clipboard-pulse-outline" />
      <BmiReport profile={profile} />
      <Row gap={10}>
        <Button style={{ flex: 1 }} variant="outline" icon="pencil" title={t('edit_profile')} onPress={() => router.push('/edit-profile')} />
        <Button style={{ flex: 1 }} icon="scale-bathroom" title={t('update_weight')} onPress={() => router.push('/weight')} />
      </Row>
    </Screen>
  );
}
