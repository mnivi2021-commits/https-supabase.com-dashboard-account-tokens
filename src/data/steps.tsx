import { Pedometer } from 'expo-sensors';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { todayKey } from '@/lib/dates';
import { useData } from './store';

interface StepsValue {
  /** null while checking. */
  available: boolean | null;
  permitted: boolean;
}

const StepsContext = createContext<StepsValue>({ available: null, permitted: false });

/**
 * Keeps today's step count in the store.
 * - iOS: reads the phone's step history for today (works even if the app was closed).
 * - Android: expo-sensors can only count while the app is open, so live deltas are added.
 */
export function StepTracker({ children }: { children: ReactNode }) {
  const { ready, profile, addSteps, setStepsAtLeast } = useData();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [permitted, setPermitted] = useState(false);
  const pending = useRef(0);
  const last = useRef(0);

  const active = ready && !!profile && Platform.OS !== 'web';

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const ok = await Pedometer.isAvailableAsync();
        if (cancelled) return;
        setAvailable(ok);
        if (!ok) return;
        const perm = await Pedometer.requestPermissionsAsync();
        if (!cancelled) setPermitted(perm.granted);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !available || !permitted) return;

    if (Platform.OS === 'ios') {
      const readToday = async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        try {
          const r = await Pedometer.getStepCountAsync(start, new Date());
          setStepsAtLeast(todayKey(), r.steps);
        } catch {}
      };
      void readToday();
      const timer = setInterval(readToday, 30_000);
      const sub = Pedometer.watchStepCount(() => {});
      const app = AppState.addEventListener('change', (s) => s === 'active' && void readToday());
      return () => {
        clearInterval(timer);
        sub.remove();
        app.remove();
      };
    }

    last.current = 0;
    const sub = Pedometer.watchStepCount((r) => {
      const delta = r.steps - last.current;
      last.current = r.steps;
      if (delta > 0) pending.current += delta;
    });
    const commitPending = () => {
      if (pending.current > 0) {
        addSteps(todayKey(), pending.current);
        pending.current = 0;
      }
    };
    const timer = setInterval(commitPending, 10_000);
    const app = AppState.addEventListener('change', (s) => s !== 'active' && commitPending());
    return () => {
      commitPending();
      clearInterval(timer);
      sub.remove();
      app.remove();
    };
  }, [active, available, permitted, addSteps, setStepsAtLeast]);

  return <StepsContext.Provider value={{ available, permitted }}>{children}</StepsContext.Provider>;
}

export const useStepsStatus = () => useContext(StepsContext);
