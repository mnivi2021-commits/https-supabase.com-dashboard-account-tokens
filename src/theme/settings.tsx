import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { translate, type Language, type TKey } from '@/i18n';
import { palettes, type Colors } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';
/** 'me' = my own health tracking; 'group' = Group Login (members' day reports only). */
export type AppMode = 'me' | 'group';

interface SettingsValue {
  ready: boolean;
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;
  isDark: boolean;
  colors: Colors;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsValue | null>(null);
const KEY = 'ht:settings:v1';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<Language>('en');
  const [appMode, setAppModeState] = useState<AppMode>('me');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const s = JSON.parse(raw) as { themeMode?: ThemeMode; language?: Language; appMode?: AppMode };
        if (s.themeMode) setThemeModeState(s.themeMode);
        if (s.language) setLanguageState(s.language);
        if (s.appMode) setAppModeState(s.appMode);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: { themeMode: ThemeMode; language: Language; appMode: AppMode }) => {
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setThemeMode = useCallback(
    (m: ThemeMode) => {
      setThemeModeState(m);
      persist({ themeMode: m, language, appMode });
    },
    [language, appMode, persist],
  );

  const setLanguage = useCallback(
    (l: Language) => {
      setLanguageState(l);
      persist({ themeMode, language: l, appMode });
    },
    [themeMode, appMode, persist],
  );

  const setAppMode = useCallback(
    (m: AppMode) => {
      setAppModeState(m);
      persist({ themeMode, language, appMode: m });
    },
    [themeMode, language, persist],
  );

  const value = useMemo<SettingsValue>(() => {
    const isDark = themeMode === 'system' ? scheme === 'dark' : themeMode === 'dark';
    return {
      ready,
      themeMode,
      setThemeMode,
      language,
      setLanguage,
      appMode,
      setAppMode,
      isDark,
      colors: isDark ? palettes.dark : palettes.light,
      t: (key, vars) => translate(language, key, vars),
    };
  }, [ready, themeMode, setThemeMode, language, setLanguage, appMode, setAppMode, scheme]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export const useTheme = () => useSettings().colors;
export const useT = () => useSettings().t;
