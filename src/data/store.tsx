import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/lib/dates';
import { isSupabaseConfigured } from '@/lib/env';
import { calcBmi, estimateCalories, waterToMl } from '@/lib/health';
import { scheduleReminders } from '@/lib/notifications';
import {
  DEFAULT_SHARE,
  DEFAULT_TARGETS,
  type FoodLog,
  type Profile,
  type Reminder,
  type SleepLog,
  type Targets,
  type WeightLog,
  type Workout,
} from '@/lib/types';
import { useSettings } from '@/theme/settings';
import { useAuth } from './auth';
import { deleteOp, profileToRow, pullAll, pushOps, upsertOp, uploadPhoto, type RemoteData, type SyncOp } from './sync';

export interface DataState {
  profile: Profile | null;
  foods: FoodLog[];
  workouts: Workout[];
  sleeps: SleepLog[];
  weights: WeightLog[];
  water: Record<string, number>;
  steps: Record<string, number>;
  targets: Targets;
  reminders: Reminder[];
}

const EMPTY: DataState = {
  profile: null,
  foods: [],
  workouts: [],
  sleeps: [],
  weights: [],
  water: {},
  steps: {},
  targets: DEFAULT_TARGETS,
  reminders: [],
};

const DATA_KEY = 'ht:data:v1';
const QUEUE_KEY = 'ht:queue:v1';
const OWNER_KEY = 'ht:owner';

export type NewWorkout = Omit<Workout, 'id' | 'created_at' | 'calories'> & { calories?: number };

interface DataValue extends DataState {
  /** Local data has loaded (and the first cloud pull finished, when signed in). */
  ready: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSync: string | null;
  saveProfile: (p: Omit<Profile, 'updated_at'>, opts?: { photoChanged?: boolean }) => void;
  logWeight: (weightKg: number, date?: string) => void;
  addFood: (f: Omit<FoodLog, 'id' | 'created_at'>) => void;
  deleteFood: (id: string) => void;
  addWorkout: (w: NewWorkout) => Workout;
  deleteWorkout: (id: string) => void;
  saveSleep: (s: Omit<SleepLog, 'id'> & { id?: string }) => void;
  /** Sets the day's water intake in millilitres. */
  setWater: (date: string, ml: number) => void;
  setStepsAtLeast: (date: string, steps: number) => void;
  addSteps: (date: string, delta: number) => void;
  saveTargets: (t: Targets) => void;
  saveReminders: (r: Reminder[]) => Promise<void>;
  syncNow: () => Promise<void>;
  clearLocal: () => Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

export const newId = () => Crypto.randomUUID();

/** water_logs keeps a legacy `glasses` column (250 ml each) next to `ml`. */
const waterRow = (date: string, ml: number) => ({ date, ml, glasses: Math.min(30, Math.round(ml / 250)) });

/** Upgrades cached data from older app versions (water used to be counted in glasses). */
function migrate(s: DataState): DataState {
  const t = s.targets as Targets & { water_glasses?: number };
  const targets: Targets = {
    ...DEFAULT_TARGETS,
    ...t,
    water_ml: t.water_ml ?? (t.water_glasses ? t.water_glasses * 250 : DEFAULT_TARGETS.water_ml),
    glass_ml: t.glass_ml ?? DEFAULT_TARGETS.glass_ml,
  };
  delete (targets as { water_glasses?: number }).water_glasses;
  const water = Object.fromEntries(Object.entries(s.water).map(([d, v]) => [d, waterToMl(v)]));
  const profile = s.profile ? { ...s.profile, share: { ...DEFAULT_SHARE, ...s.profile.share } } : null;
  return { ...s, foods: s.foods ?? [], targets, water, profile };
}

function mergeRemote(local: DataState, remote: RemoteData, queue: SyncOp[]): DataState {
  const pending = (table: string) => {
    const ids = new Set<string>();
    const deleted = new Set<string>();
    for (const op of queue) {
      if (op.table !== table) continue;
      if (op.type === 'delete' && op.id) deleted.add(op.id);
      if (op.type === 'upsert' && op.row?.id) ids.add(String(op.row.id));
      if (op.type === 'upsert' && op.row?.date) ids.add(String(op.row.date));
    }
    return { ids, deleted };
  };

  function byId<T extends { id: string }>(table: string, l: T[], r: T[]): T[] {
    const { ids, deleted } = pending(table);
    const map = new Map(r.filter((x) => !deleted.has(x.id)).map((x) => [x.id, x]));
    for (const x of l) if (ids.has(x.id)) map.set(x.id, x);
    return [...map.values()];
  }

  const waterPending = pending('water_logs').ids;
  const water = { ...remote.water };
  for (const [d, g] of Object.entries(local.water)) if (waterPending.has(d)) water[d] = g;

  const steps = { ...remote.steps };
  for (const [d, s] of Object.entries(local.steps)) steps[d] = Math.max(s, steps[d] ?? 0);

  const profilePending = queue.some((op) => op.table === 'profiles');
  const targetsPending = queue.some((op) => op.table === 'targets');

  let profile = profilePending ? local.profile : (remote.profile ?? local.profile);
  if (profile && local.profile && profile !== local.profile) {
    // Keep the device-only photo file if it is the same photo.
    profile = { ...profile, photo_uri: local.profile.photo_uri, photo_pending: local.profile.photo_pending };
  }

  return {
    profile,
    foods: byId('food_logs', local.foods, remote.foods),
    workouts: byId('workouts', local.workouts, remote.workouts),
    sleeps: byId('sleep_logs', local.sleeps, remote.sleeps),
    weights: byId('weight_logs', local.weights, remote.weights).sort((a, b) => a.date.localeCompare(b.date)),
    water,
    steps,
    targets: targetsPending ? local.targets : (remote.targets ?? local.targets),
    reminders: byId('reminders', local.reminders, remote.reminders),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, userId, guest } = useAuth();
  const { t } = useSettings();

  const [state, setState] = useState<DataState>(EMPTY);
  const stateRef = useRef<DataState>(EMPTY);
  const queueRef = useRef<SyncOp[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const flushing = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId;
  const tRef = useRef(t);
  tRef.current = t;

  // ---------- persistence ----------

  const persistState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(DATA_KEY, JSON.stringify(stateRef.current)).catch(() => {});
    }, 400);
  }, []);

  const persistQueue = useCallback(() => {
    setPendingCount(queueRef.current.length);
    AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queueRef.current)).catch(() => {});
  }, []);

  const flush = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !isSupabaseConfigured || flushing.current) return;
    flushing.current = true;
    setSyncing(true);
    try {
      const p = stateRef.current.profile;
      if (p?.photo_pending && p.photo_uri) {
        try {
          const path = await uploadPhoto(uid, p.photo_uri);
          const next = { ...p, photo_path: path, photo_pending: false };
          stateRef.current = { ...stateRef.current, profile: next };
          setState(stateRef.current);
          persistState();
          enqueueRaw([upsertOp('profiles', profileToRow(next), 'me')]);
        } catch (e) {
          console.warn('[sync] photo upload failed', e);
        }
      }
      const snapshot = [...queueRef.current];
      if (snapshot.length) {
        const done = new Set(await pushOps(snapshot, uid));
        queueRef.current = queueRef.current.filter((op) => !done.has(op));
        persistQueue();
      }
      setLastSync(new Date().toISOString());
    } finally {
      flushing.current = false;
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistQueue, persistState]);

  const scheduleFlush = useCallback(() => {
    if (!userIdRef.current) return;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flush(), 2000);
  }, [flush]);

  function enqueueRaw(ops: SyncOp[]) {
    let q = queueRef.current;
    for (const op of ops) q = [...q.filter((x) => x.key !== op.key), op];
    queueRef.current = q;
    persistQueue();
  }

  const commit = useCallback(
    (next: DataState, ops: SyncOp[] = []) => {
      stateRef.current = next;
      setState(next);
      persistState();
      if (ops.length) {
        enqueueRaw(ops);
        scheduleFlush();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistState, scheduleFlush],
  );

  // ---------- initial load ----------

  useEffect(() => {
    (async () => {
      try {
        const [raw, rawQueue] = await Promise.all([AsyncStorage.getItem(DATA_KEY), AsyncStorage.getItem(QUEUE_KEY)]);
        if (raw) {
          const parsed = migrate({ ...EMPTY, ...(JSON.parse(raw) as Partial<DataState>) });
          stateRef.current = parsed;
          setState(parsed);
        }
        if (rawQueue) {
          queueRef.current = JSON.parse(rawQueue) as SyncOp[];
          setPendingCount(queueRef.current.length);
        }
      } catch (e) {
        console.warn('[data] failed to load cache', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const clearLocal = useCallback(async () => {
    stateRef.current = EMPTY;
    queueRef.current = [];
    setState(EMPTY);
    setPendingCount(0);
    await AsyncStorage.multiRemove([DATA_KEY, QUEUE_KEY, OWNER_KEY]).catch(() => {});
    await scheduleReminders([], tRef.current).catch(() => {});
  }, []);

  // When the signed-in user changes: make sure local data belongs to them, then pull + push.
  useEffect(() => {
    if (!loaded || authLoading) return;
    const who = userId ?? (guest ? 'guest' : 'none');
    if (hydratedFor === who) return;
    let cancelled = false;

    (async () => {
      if (userId) {
        const owner = await AsyncStorage.getItem(OWNER_KEY).catch(() => null);
        if (owner && owner !== userId && owner !== 'guest') await clearLocal();
        await AsyncStorage.setItem(OWNER_KEY, userId).catch(() => {});
        if (isSupabaseConfigured) {
          setSyncing(true);
          try {
            const remote = await pullAll(userId);
            if (cancelled) return;
            // Guest data that was never uploaded: queue it for this account.
            if (owner === 'guest') enqueueAll(stateRef.current);
            const merged = mergeRemote(stateRef.current, remote, queueRef.current);
            stateRef.current = merged;
            setState(merged);
            persistState();
            setLastSync(new Date().toISOString());
          } catch (e) {
            console.warn('[data] pull failed (offline?)', e);
          } finally {
            setSyncing(false);
          }
          void flush();
        }
        scheduleReminders(stateRef.current.reminders, tRef.current).catch(() => {});
      } else if (guest) {
        const owner = await AsyncStorage.getItem(OWNER_KEY).catch(() => null);
        if (owner && owner !== 'guest') await clearLocal();
        await AsyncStorage.setItem(OWNER_KEY, 'guest').catch(() => {});
      }
      if (!cancelled) setHydratedFor(who);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, authLoading, userId, guest]);

  function enqueueAll(s: DataState) {
    const ops: SyncOp[] = [];
    if (s.profile) ops.push(upsertOp('profiles', profileToRow(s.profile), 'me'));
    for (const x of s.foods) ops.push(upsertOp('food_logs', { ...x }, x.id));
    for (const w of s.workouts) ops.push(upsertOp('workouts', { ...w }, w.id));
    for (const x of s.sleeps) ops.push(upsertOp('sleep_logs', { ...x }, x.id));
    for (const x of s.weights) ops.push(upsertOp('weight_logs', { ...x }, x.id));
    for (const [date, ml] of Object.entries(s.water)) ops.push(upsertOp('water_logs', waterRow(date, ml), date));
    for (const [date, steps] of Object.entries(s.steps)) ops.push(upsertOp('step_logs', { date, steps }, date));
    ops.push(upsertOp('targets', { ...s.targets }, 'me'));
    for (const r of s.reminders) ops.push(upsertOp('reminders', { ...r }, r.id));
    enqueueRaw(ops);
  }

  /** Pull-to-refresh / "Sync now": upload pending changes, then reload this user's data from the cloud. */
  const refreshAll = useCallback(async () => {
    await flush();
    const uid = userIdRef.current;
    if (!uid || !isSupabaseConfigured) return;
    setSyncing(true);
    try {
      const remote = await pullAll(uid);
      const merged = mergeRemote(stateRef.current, remote, queueRef.current);
      stateRef.current = merged;
      setState(merged);
      persistState();
      setLastSync(new Date().toISOString());
    } catch (e) {
      console.warn('[data] refresh failed (offline?)', e);
    } finally {
      setSyncing(false);
    }
  }, [flush, persistState]);

  // Retry the queue whenever the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void flush();
    });
    return () => sub.remove();
  }, [flush]);

  // ---------- mutations ----------

  const upsertWeightLog = (s: DataState, weightKg: number, date: string, heightCm: number) => {
    const existing = s.weights.find((w) => w.date === date);
    const log: WeightLog = { id: existing?.id ?? newId(), date, weight_kg: weightKg, bmi: calcBmi(weightKg, heightCm) };
    const weights = [...s.weights.filter((w) => w.id !== log.id), log].sort((a, b) => a.date.localeCompare(b.date));
    return { weights, op: upsertOp('weight_logs', { ...log }, log.id) };
  };

  const saveProfile = useCallback<DataValue['saveProfile']>(
    (p, opts) => {
      const s = stateRef.current;
      const profile: Profile = {
        ...p,
        photo_pending: opts?.photoChanged ? !!p.photo_uri : p.photo_pending,
        photo_path: opts?.photoChanged && !p.photo_uri ? null : p.photo_path,
        updated_at: new Date().toISOString(),
      };
      const ops: SyncOp[] = [upsertOp('profiles', profileToRow(profile), 'me')];
      let weights = s.weights;
      if (!s.profile || s.profile.weight_kg !== profile.weight_kg || s.profile.height_cm !== profile.height_cm) {
        const res = upsertWeightLog(s, profile.weight_kg, todayKey(), profile.height_cm);
        weights = res.weights;
        ops.push(res.op);
      }
      commit({ ...s, profile, weights }, ops);
    },
    [commit],
  );

  const logWeight = useCallback<DataValue['logWeight']>(
    (weightKg, date = todayKey()) => {
      const s = stateRef.current;
      if (!s.profile) return;
      const res = upsertWeightLog(s, weightKg, date, s.profile.height_cm);
      const ops: SyncOp[] = [res.op];
      let profile = s.profile;
      const latest = res.weights[res.weights.length - 1];
      if (latest && latest.date === date) {
        profile = { ...s.profile, weight_kg: weightKg, updated_at: new Date().toISOString() };
        ops.push(upsertOp('profiles', profileToRow(profile), 'me'));
      }
      commit({ ...s, profile, weights: res.weights }, ops);
    },
    [commit],
  );

  const addWorkout = useCallback<DataValue['addWorkout']>(
    (w) => {
      const s = stateRef.current;
      const workout: Workout = {
        ...w,
        id: newId(),
        created_at: new Date().toISOString(),
        calories: w.calories ?? estimateCalories(w, s.profile?.weight_kg ?? 60),
      };
      commit({ ...s, workouts: [...s.workouts, workout] }, [upsertOp('workouts', { ...workout }, workout.id)]);
      return workout;
    },
    [commit],
  );

  const addFood = useCallback<DataValue['addFood']>(
    (input) => {
      const s = stateRef.current;
      const food: FoodLog = { ...input, id: newId(), created_at: new Date().toISOString() };
      commit({ ...s, foods: [...s.foods, food] }, [upsertOp('food_logs', { ...food }, food.id)]);
    },
    [commit],
  );

  const deleteFood = useCallback<DataValue['deleteFood']>(
    (id) => {
      const s = stateRef.current;
      commit({ ...s, foods: s.foods.filter((x) => x.id !== id) }, [deleteOp('food_logs', id)]);
    },
    [commit],
  );

  const deleteWorkout = useCallback<DataValue['deleteWorkout']>(
    (id) => {
      const s = stateRef.current;
      commit({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }, [deleteOp('workouts', id)]);
    },
    [commit],
  );

  const saveSleep = useCallback<DataValue['saveSleep']>(
    (input) => {
      const s = stateRef.current;
      const existing = s.sleeps.find((x) => x.id === input.id || x.date === input.date);
      const log: SleepLog = { ...input, id: existing?.id ?? input.id ?? newId() };
      commit({ ...s, sleeps: [...s.sleeps.filter((x) => x.id !== log.id), log] }, [
        upsertOp('sleep_logs', { ...log }, log.id),
      ]);
    },
    [commit],
  );

  const setWater = useCallback<DataValue['setWater']>(
    (date, ml) => {
      const s = stateRef.current;
      const v = Math.max(0, Math.min(7000, Math.round(ml)));
      commit({ ...s, water: { ...s.water, [date]: v } }, [upsertOp('water_logs', waterRow(date, v), date)]);
    },
    [commit],
  );

  const setStepsAtLeast = useCallback<DataValue['setStepsAtLeast']>(
    (date, steps) => {
      const s = stateRef.current;
      if ((s.steps[date] ?? 0) >= steps) return;
      commit({ ...s, steps: { ...s.steps, [date]: steps } }, [upsertOp('step_logs', { date, steps }, date)]);
    },
    [commit],
  );

  const addSteps = useCallback<DataValue['addSteps']>(
    (date, delta) => {
      if (delta <= 0) return;
      const s = stateRef.current;
      const steps = (s.steps[date] ?? 0) + delta;
      commit({ ...s, steps: { ...s.steps, [date]: steps } }, [upsertOp('step_logs', { date, steps }, date)]);
    },
    [commit],
  );

  const saveTargets = useCallback<DataValue['saveTargets']>(
    (targets) => {
      const s = stateRef.current;
      commit({ ...s, targets }, [upsertOp('targets', { ...targets }, 'me')]);
    },
    [commit],
  );

  const saveReminders = useCallback<DataValue['saveReminders']>(
    async (reminders) => {
      const s = stateRef.current;
      const keep = new Set(reminders.map((r) => r.id));
      const ops: SyncOp[] = [
        ...s.reminders.filter((r) => !keep.has(r.id)).map((r) => deleteOp('reminders', r.id)),
        ...reminders.map((r) => upsertOp('reminders', { ...r }, r.id)),
      ];
      commit({ ...s, reminders }, ops);
      await scheduleReminders(reminders, tRef.current);
    },
    [commit],
  );

  const ready = loaded && !authLoading && hydratedFor === (userId ?? (guest ? 'guest' : 'none'));

  const value = useMemo<DataValue>(
    () => ({
      ...state,
      ready,
      syncing,
      pendingCount,
      lastSync,
      saveProfile,
      logWeight,
      addFood,
      deleteFood,
      addWorkout,
      deleteWorkout,
      saveSleep,
      setWater,
      setStepsAtLeast,
      addSteps,
      saveTargets,
      saveReminders,
      syncNow: refreshAll,
      clearLocal,
    }),
    [
      state,
      ready,
      syncing,
      pendingCount,
      lastSync,
      saveProfile,
      logWeight,
      addFood,
      deleteFood,
      addWorkout,
      deleteWorkout,
      saveSleep,
      setWater,
      setStepsAtLeast,
      addSteps,
      saveTargets,
      saveReminders,
      refreshAll,
      clearLocal,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
