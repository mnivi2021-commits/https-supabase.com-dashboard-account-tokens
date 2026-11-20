import en from './en';
import hi from './hi';
import ta from './ta';

export type TKey = keyof typeof en;
export type Language = 'en' | 'ta' | 'hi';
export type Dictionary = Partial<Record<TKey, string>>;

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
];

const dictionaries: Record<Language, Dictionary> = { en, ta, hi };

/** Looks up a key (falling back to English) and fills {placeholders}. */
export function translate(lang: Language, key: TKey, vars?: Record<string, string | number>): string {
  let s = dictionaries[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
