import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppHeader, WaveBanner } from '@/components/AppHeader';
import { BmiReport } from '@/components/BmiReport';
import { LanguagePicker } from '@/components/LanguagePicker';
import { ProfileForm, type ProfileDraft } from '@/components/ProfileForm';
import { Button, Row, Screen, Txt } from '@/components/ui';
import { BRAND, GradientButton } from '@/components/WelcomeArt';
import { useAuth } from '@/data/auth';
import { newId, useData } from '@/data/store';
import { parseKey, todayKey } from '@/lib/dates';
import { dailyWater, round1 } from '@/lib/health';
import { ensureNotificationPermission } from '@/lib/notifications';
import { DEFAULT_TARGETS } from '@/lib/types';
import { useSettings } from '@/theme/settings';

/** First-time setup: one-page "My Profile" form → "My Health Report" → start. */
export default function Onboarding() {
  const { t, colors: c } = useSettings();
  const { signOut } = useAuth();
  const { saveProfile, saveTargets, saveReminders } = useData();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!draft) return;
    setSaving(true);
    const months = Math.max(1, (parseKey(draft.target_date).getTime() - parseKey(todayKey()).getTime()) / (30 * 86_400_000));
    const monthly = round1(Math.min(3, Math.abs(draft.target_weight_kg - draft.weight_kg) / months)) || 1;
    saveTargets({ ...DEFAULT_TARGETS, water_ml: dailyWater(draft.weight_kg).ml, monthly_weight_change_kg: monthly });
    // Weekly weight check-in (Sunday 8:00 AM) feeds the BMI history chart.
    try {
      const ok = await ensureNotificationPermission();
      await saveReminders([{ id: newId(), kind: 'weight', hour: 8, minute: 0, weekday: 1, enabled: ok }]);
    } catch {}
    // Saving the profile flips the navigation guard to the main tabs.
    saveProfile(draft, { photoChanged });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        {!draft ? (
          <>
            {/* Back = leave setup and return to the Welcome screen. */}
            <AppHeader onBack={() => void signOut()} showBell={false} />
            <LanguagePicker />
            <ProfileForm
              wizard
              submitLabel={t('calculate_bmi')}
              onSubmit={(d, changed) => {
                setDraft(d);
                setPhotoChanged(changed);
              }}
            />
          </>
        ) : (
          <>
            <AppHeader onBack={() => setDraft(null)} showBell={false} />
            <WaveBanner title={t('my_health_report')} subtitle={t('my_health_report_sub')} icon="clipboard-pulse-outline" />
            <BmiReport profile={draft} />
            <Row gap={10}>
              <Button style={{ flex: 1 }} variant="outline" icon="pencil" title={t('edit')} onPress={() => setDraft(null)} />
              <View style={{ flex: 2 }}>
                <GradientButton
                  title={saving ? '…' : t('start_tracking')}
                  icon="check-circle"
                  colors={[BRAND.greenLight, BRAND.green]}
                  onPress={finish}
                />
              </View>
            </Row>
            <Txt muted size="small" center color={c.muted}>
              {t('weekly_weight_note')}
            </Txt>
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
