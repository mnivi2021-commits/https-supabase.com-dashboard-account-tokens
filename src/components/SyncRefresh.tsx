import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useData } from '@/data/store';
import { useTheme } from '@/theme/settings';

/** Pull down to refresh: uploads pending changes and reloads from the cloud. */
export function SyncRefresh(props: Partial<RefreshControlProps>) {
  const c = useTheme();
  const { syncing, syncNow } = useData();
  return (
    <RefreshControl
      {...props}
      refreshing={syncing}
      onRefresh={() => void syncNow()}
      tintColor={c.primary}
      colors={[c.primary]}
    />
  );
}
