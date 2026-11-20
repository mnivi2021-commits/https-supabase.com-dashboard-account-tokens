import { useLocalSearchParams } from 'expo-router';

import { GroupsScreen } from '@/features/group/GroupsScreen';

export default function GroupTab() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <GroupsScreen initialCode={code} />;
}
