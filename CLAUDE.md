@AGENTS.md

# Health Tracker – project guide

Family health-tracking app: BMI report, workouts, pedometer steps, sleep, water, targets, reports,
and a 5-member family/friends group with a monthly weight-change-% challenge.
Expo SDK 58 · Expo Router · TypeScript (strict) · Supabase · English / Tamil / Hindi · light / dark.

## Developer constraints

- The developer tests on a **real phone with Expo Go**. The PC has low RAM (4 GB): **no emulator**, and keep tooling light.
- **Only use libraries bundled in Expo Go.** Adding a native module that Expo Go lacks breaks the dev workflow.
  Install with `npx expo install <pkg>`.
- npm on this machine hits intermittent `ERR_SSL_CIPHER_OPERATION_FAILED`: retry with `--maxsockets=2`.
  `.npmrc` sets `legacy-peer-deps=true` to avoid a known react-dom peer conflict. Keep it.
- Secrets live in `.env` (gitignored). Only `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` go there. Never add a service_role key.

## Verify before declaring done

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android --output-dir <temp dir>   # full bundle check, then delete the output
```

## Architecture

- **Routing** (`src/app/`): `_layout.tsx` wraps providers (Settings → Auth → Data → StepTracker) and gates screens with
  `Stack.Protected`: login (signed out) → onboarding (no profile) → `(tabs)` + stack screens. Saving the profile
  flips the guard automatically, so do not `router.push` between those three states.
  Tabs come from `expo-router/js-tabs` (the `Tabs` export from `expo-router` is deprecated in SDK 58).
- **Data is offline-first** (`src/data/store.tsx`): all state lives in one `DataState` persisted to AsyncStorage
  (`ht:data:v1`). Every mutation calls `commit(next, ops)`, which updates state and enqueues `SyncOp`s (`ht:queue:v1`,
  deduped by `key`). The queue flushes to Supabase 2 s after a change, on app foreground and after login.
  Network errors stop the flush and keep the queue; server rejections are logged and dropped.
  New synced data → add it to `DataState`, `sync.ts` (`ON_CONFLICT`, `pullAll`), `mergeRemote`, `enqueueAll` and `schema.sql`.
- **Ownership**: `ht:owner` records whose data is cached (user id or `guest`). Guest data is uploaded when that guest signs in.
  Data from a different user is cleared. Sign-out calls `signOut()` **before** `clearLocal()` so the tabs unmount first.
- **Day keys** are local `YYYY-MM-DD` strings (`src/lib/dates.ts`). Pass the client's `todayKey()` to RPCs; never rely on the server date.
- **Steps** (`src/data/steps.tsx`): iOS reads `getStepCountAsync` (today's history); Android only has live
  `watchStepCount` deltas while the app is open. `walk.tsx` is a separate live session that is saved as a walking workout.
- **Group** (`src/features/group/`): users can be in several groups (max 10; 5 members each). Joining is a request the
  admin approves (`request_join` → `list_join_requests` / `respond_join_request`). The client never reads group mates'
  tables directly: SECURITY DEFINER functions that take `p_group_id` (`get_group_dashboard`, `get_group_summary`,
  `get_group_challenge`, `leave_group`, `remove_member`, `set_my_category`) check `is_member` and apply each member's
  `profiles.share` settings. `GroupsScreen` (group selector) is shared by the Group tab and `group-home`.
- **App mode** (`useSettings().appMode`): `me` = normal tabs; `group` = "Group Login", routed to `src/app/group-home.tsx`
  (member day reports only, needs a real session). Chosen on the login page; switchable from Profile / group-home.
- **Water** is stored in **ml** (`water[date]`, `targets.water_ml`, `targets.glass_ml`). `migrate()` in store.tsx converts
  old glass counts; `water_logs` keeps a legacy `glasses` column.
- **Login**: "Start" = `supabase.auth.signInAnonymously()` (enabled via `external_anonymous_users_enabled` in the setup script); email link / Google are optional. Anonymous accounts cannot be recovered after sign-out, so the UI warns.
- **Member No + PIN** (`src/features/share/`): `profiles.member_no` (sequence → "HT001") + `profiles.share_pin` + `share_links(owner_id, viewer_id)`; RPCs `my_member_card`, `reset_member_pin`, `add_member` (returns 'OK:<name>' or an error word so failed attempts persist in `share_attempts`; 5 wrong PINs/hour lock a number), `get_shared_dashboard`, `my_viewers`, `remove_viewer`, `remove_shared`. Group Login = anonymous sign-in + Member No/PIN (no profile needed). Per-person day data comes from internal `person_day()` (EXECUTE revoked from app roles).
- **Grants**: newer Supabase projects need explicit table GRANTs; they are at the end of schema.sql and verified by the setup script.
- **Login on the free Supabase plan** uses the emailed magic link → `/auth-callback?code=` → `exchangeCodeForSession`
  (the email template, and so a 6-digit code, needs custom SMTP).
  Business errors are raised as codes (`GROUP_FULL`, `INVALID_CODE`, …) and mapped to i18n keys in `groupErrorKey`.
- **Photos**: stored locally (`photo_uri`, copied to the document dir) and uploaded to the private `avatars` bucket at
  `<uid>/profile.jpg` (`photo_path`). Group mates get signed URLs, and only if the owner shares their photo.
- **Notifications**: local only (`src/lib/notifications.ts`). `scheduleReminders` cancels all, then reschedules from
  `reminders`. Weekday convention is 1 = Sunday (expo-notifications).

## Conventions

- **i18n**: every user-facing string goes through `t('key')` from `useSettings()` / `useT()`. `src/i18n/en.ts` defines
  the keys (the `TKey` type); `ta.ts` / `hi.ts` are `Partial` and fall back to English. Add new keys to all three.
  Multi-line tips use `\n`. Dynamic keys (`w_${type}`, `wd_${n}`, `bmi_${cat}`) need `as TKey`.
- **UI**: use the kit in `src/components/ui.tsx` (`Screen`, `Card`, `Txt`, `Button`, `Field`, `Segmented`, `Chip`, …)
  and colours from `useTheme()`. Never hard-code light-only colours. Keep touch targets ≥ 46 px and fonts large (elder-friendly).
- **Icons**: `MaterialCommunityIcons` names. Check a name exists in
  `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json`.
- **Health maths** stays in `src/lib/health.ts` (Asian BMI cut-offs 18.5 / 23 / 25, MET table, Mifflin–St Jeor).
- Route files export only the default screen component; put helpers in `src/lib` or `src/components`.
- Charts use `react-native-gifted-charts` (needs `react-native-svg`, `expo-linear-gradient`).

## Database

`supabase/schema.sql` is the single source of truth and is idempotent. The developer re-runs it in the Supabase SQL editor.
Keep RLS on every table. Own-row policies use `user_id = auth.uid()`. Use `my_group_id()` / `is_group_mate()` helpers
(SECURITY DEFINER) to avoid recursive policies.
