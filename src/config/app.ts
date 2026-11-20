// App-wide settings that change between testing and launch. Change them here (or in .env).

/**
 * Where invited people download the app. While testing this points to Expo Go;
 * after building an APK (EAS) or publishing to the Play Store, set
 * EXPO_PUBLIC_DOWNLOAD_URL in .env — no code change needed.
 */
export const DOWNLOAD_URL = process.env.EXPO_PUBLIC_DOWNLOAD_URL || 'https://expo.dev/go';

/** Default country code for mobile numbers (India). */
export const DEFAULT_COUNTRY_CODE = '91';

/** Invite code from a link opened before login (AsyncStorage key). */
export const PENDING_JOIN_KEY = 'ht:pending-join';
