import { Chip, Row } from '@/components/ui';
import type { GroupCategory } from '@/lib/types';
import { useSettings } from '@/theme/settings';

/** Weight-loss or Healthy-gain category for the monthly challenge. */
export function CategoryPicker({ value, onChange }: { value: GroupCategory; onChange: (c: GroupCategory) => void }) {
  const { t } = useSettings();
  return (
    <Row gap={8} style={{ flexWrap: 'wrap' }}>
      <Chip label={`⬇️ ${t('cat_loss')}`} selected={value === 'loss'} onPress={() => onChange('loss')} />
      <Chip label={`⬆️ ${t('cat_gain')}`} selected={value === 'gain'} onPress={() => onChange('gain')} color="#0284C7" />
    </Row>
  );
}
