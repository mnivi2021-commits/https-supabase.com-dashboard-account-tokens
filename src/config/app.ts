// App-wide settings that change between testing and launch. Change them here (or in .env).

/**
 * The public "Health Track" web page (docs/ folder, published with GitHub Pages).
 * Change EXPO_PUBLIC_WEB_URL in .env if you move it (e.g. to your own domain).
 */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://mnivi2021-commits.github.io/health-track').replace(/\/$/, '');

/**
 * Where invited people download the app: the web page's download button.
 * After a Play Store launch, set EXPO_PUBLIC_DOWNLOAD_URL to the store link — no code change needed.
 */
export const DOWNLOAD_URL = process.env.EXPO_PUBLIC_DOWNLOAD_URL || `${WEB_URL}/`;

/**
 * Invite link shown in WhatsApp. A normal web link is tappable everywhere; the page
 * shows the code and opens the app (or offers the download).
 */
export const joinUrl = (code: string) => `${WEB_URL}/join.html?code=${encodeURIComponent(code)}`;

/** Default country code for mobile numbers (India). */
export const DEFAULT_COUNTRY_CODE = '91';

/** Invite code from a link opened before login (AsyncStorage key). */
export const PENDING_JOIN_KEY = 'ht:pending-join';
