import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ProfileForm } from '@/components/ProfileForm';
import { Screen } from '@/components/ui';
import { useData } from '@/data/store';
import { useSettings } from '@/theme/settings';

/** Same "My Profile" design as first-time setup; saving opens the updated health report. */
export default function EditProfile() {
  const { t } = useSettings();
  const { profile, saveProfile } = useData();
  if (!profile) return null;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader />
        <ProfileForm
          initial={profile}
          submitLabel={t('save_and_calculate')}
          onSubmit={(draft, photoChanged) => {
            saveProfile(draft, { photoChanged });
            router.replace('/bmi-report');
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
