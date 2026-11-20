# ❤️ Health Tracker

A family-friendly health app built with **Expo (SDK 58) + Expo Router + TypeScript + Supabase**.
Track BMI, workouts, steps, sleep and water, set targets, see daily / weekly / monthly reports,
and compete with up to 5 family members or friends in a fair monthly weight challenge.

Works in **English, தமிழ் and हिन्दी**, in light and dark mode, with big buttons that are easy for elders to use.

---

## Features

| Area | What it does |
|---|---|
| **Login** | **My Login → Start**: one tap, no email (Supabase anonymous sign-in; data is backed up and tied to this phone). Email / Google are optional, for using the same data on another phone. Offline mode only when Supabase is not configured |
| **Share code (Group Login)** | Every user gets a personal 8-character code (Profile / Home). Family choose **Group Login**, enter the code and their name, and see that person's daily report (food, water, workout, sleep, steps, target, with ◀ ▶ days) — no email needed. The owner sees who has access, can remove anyone, or make a new code |
| **Profile & BMI** | 8-step onboarding (name, age, gender, height in cm or ft/in, weight, blood group, private photo, target weight + date) with **animated how-to-measure guides** for height, weight and the full-size photo → BMI report with **Asian/Indian ranges**, colour gauge, ideal weight range, daily calories & water, diet / exercise / lifestyle tips, doctor disclaimer |
| **Workouts** | 10 workouts (walking, jogging, running, cycling, yoga, pull-ups, sit-ups, push-ups, squats, skipping). Time-based or reps × sets. Calories via the **MET formula** using your weight. **Live walk** mode with pedometer steps |
| **Steps** | Automatic step counting with the phone pedometer (`expo-sensors`) |
| **Sleep** | Bedtime + wake time → hours, quality 😴 / 😐 / 😫, 7-night chart, bedtime reminder |
| **Food** | Pick from ~45 common Indian foods (or add your own) per meal — breakfast, lunch, snacks, dinner — with quantity; calories, protein, carbs and fat are calculated against your daily calorie target. Shown first on Home and in group member cards |
| **Water** | Counted in **ml**: pick a glass size (100 / 200 / 250 ml), each tap adds one glass; daily target in ml |
| **Reminders** | 1 or 2 workout reminders per day at your chosen times, bedtime reminder, weekly weigh-in reminder |
| **Targets** | Daily steps / workout minutes / sleep / water, monthly weight-loss or gain goal, progress rings on Home |
| **Reports** | Day, week (bar charts, totals, best day) and month (weight line chart, weight & BMI change, BMI history). 🔥 streaks and badges. **Export PDF** or **share as image** |
| **Group** | Be in **several groups** (e.g. Family Group 1, Family Group 2, Friends Group). Create a group → 6-digit invite code (share on WhatsApp) → others send a **join request** → the **admin approves or rejects** → up to 5 members. Member cards show photo, name, weight, BMI and **Today vs Yesterday**: target achieved ✅/❌, water (ml), sleep, steps, workout. Members choose what to share (photo is private by default). Admin can remove members. 👏 cheers, daily motivation, guidelines |
| **Monthly challenge** | Winner = highest **weight-change %** (not kg, so it is fair). Separate **Healthy Gain** category. 🏆 last-month winner card + 🥇🥈🥉 leaderboard. Group summary for day / week / month |
| **Offline** | Everything is saved on the phone first (AsyncStorage) and uploaded to Supabase when online |

> General guidance only – consult a doctor for medical advice.

---

## 1. Requirements

- **Node.js 20+** and npm
- A phone with **Expo Go** installed ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)), on the same Wi-Fi as your PC
- A free **Supabase** account: https://supabase.com

No Android emulator is needed, so it works on low-RAM PCs.

## 2. Install

```bash
git clone https://github.com/<you>/health-tracker.git
cd health-tracker
npm install
```

The project has a `.npmrc` with `legacy-peer-deps=true`. This avoids a known peer-dependency conflict
between Expo's optional `react-dom` dependency and React 19.3.

## 3. Set up Supabase (about 10 minutes)

### Quick way (one command)

1. Sign up at https://supabase.com and create a **personal access token** at https://supabase.com/dashboard/account/tokens.
2. Put it in `.env` as `SUPABASE_ACCESS_TOKEN=sbp_...`.
3. Run `npm run setup:supabase`.

The script creates the project (Mumbai region), runs the schema, sets up the 6-digit login code email and redirect URLs,
and fills in the `EXPO_PUBLIC_*` values in `.env`. It is safe to re-run. To enable Google sign-in, also add
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (see step 5 below) and run it again.

### Manual way

1. **Create a project** at https://supabase.com/dashboard. Choose a region close to you (e.g. Mumbai).
2. **Create the database**: open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), then click **Run**.
   This creates the tables, Row Level Security policies, the private `avatars` photo bucket and the group functions.
3. **Email login with a code**: go to **Authentication → Email Templates → Magic Link** and make sure the email body contains `{{ .Token }}`,
   for example:
   ```html
   <h2>Your Health Tracker code</h2>
   <p>Enter this code in the app: <b>{{ .Token }}</b></p>
   ```
   (The free Supabase email service has a low hourly limit. For real use, add your own SMTP under **Project Settings → Authentication**.)
4. **Redirect URLs** (needed for Google sign-in): go to **Authentication → URL Configuration → Redirect URLs** and add:
   ```
   exp://**
   healthtracker://**
   ```
5. **Google sign-in (optional)**:
   - In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
   - Under *Authorized redirect URIs*, add `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - In Supabase, go to **Authentication → Providers → Google**, enable it, and paste the client ID and secret.
6. **Copy your keys**: in **Project Settings → API**, copy the *Project URL* and the *anon public* key.

## 4. Add your keys

```bash
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env` is in `.gitignore`, so it is never committed. The anon key is designed to be public: Row Level Security protects the data.
**Never** put the `service_role` key in the app.

Without a `.env`, the app still runs in offline-only mode (groups are disabled).

## 5. Run on your phone

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iPhone).
If the phone cannot connect (for example on office or hostel Wi-Fi), use:

```bash
npx expo start --tunnel
```

After changing `.env`, restart with `npx expo start -c` to clear the cache.

---

## Expo Go notes and limitations

| Feature | In Expo Go |
|---|---|
| Steps (iOS) | ✅ Reads today's step history from the phone |
| Steps (Android) | ⚠️ Counts steps **only while the app is open**. This is an `expo-sensors` limitation on Android. Use **Live walk** for walks, or enter steps when logging a walk |
| Reminders | ✅ Local notifications work. Remote push is not used |
| Google sign-in | ✅ Uses the browser + Supabase OAuth. The `exp://**` redirect URL must be added (step 3.4) |
| Invite deep link | In Expo Go the link opens only on phones that are running the same dev server, so members should **type the 6-digit code** (Group → Join). The link works fully in a real build |

To build a real APK later (no PC emulator needed): `npx eas-cli@latest build -p android --profile preview`.

---

## Project structure

```
src/
  app/                    Expo Router screens (every file is a route)
    _layout.tsx           Providers + login / onboarding / app gating (Stack.Protected)
    login.tsx             Email OTP, Google, offline mode
    onboarding.tsx        8-question wizard + BMI report
    (tabs)/               Home · Workout · Sleep · Reports · Group · Profile
    log-workout.tsx       Log one workout (time-based or reps × sets)
    walk.tsx              Live walk with pedometer
    weight.tsx, bmi-report.tsx, edit-profile.tsx, targets.tsx, reminders.tsx, privacy.tsx
    join.tsx              Invite deep link → Group tab
  components/             UI kit (ui.tsx), BMI gauge/report, progress ring, pickers
  data/
    auth.tsx              Supabase auth (OTP, Google OAuth, guest)
    store.tsx             Offline-first data store (AsyncStorage + sync queue)
    sync.ts               Push/pull to Supabase, photo upload
    steps.tsx             Pedometer → daily steps
  features/group/         Group API (RPC calls) and screens
  lib/                    BMI / MET / calorie formulas, dates, metrics, notifications, PDF report
  i18n/                   en.ts (source of keys), ta.ts, hi.ts
  theme/                  Colours and settings (theme + language)
supabase/schema.sql       Tables, RLS, storage bucket, group functions
```

## Database

Tables: `profiles`, `weight_logs`, `workouts`, `sleep_logs`, `water_logs`, `step_logs`, `targets`, `reminders`,
`groups`, `group_members`, `group_join_requests`, `cheers`.

- **Row Level Security** is enabled on every table. Users read and write only their own rows.
- Group members see each other **only** through the `get_group_dashboard`, `get_group_summary` and `get_group_challenge`
  functions, which hide every field a member chose not to share.
- Photos are stored in a **private** bucket. A group mate can view a photo only when its owner turned on "Share my photo".
- A trigger enforces **5 members per group**. A user can be in up to 10 groups. Joining needs the admin's approval (`request_join` → `respond_join_request`).

## Health formulas

- **BMI** = weight (kg) / height (m)². Asian/Indian cut-offs: < 18.5 under · 18.5–22.9 normal · 23–24.9 over · ≥ 25 obese
- **Ideal weight** = 18.5–22.9 × height (m)²
- **Calories / day**: Mifflin–St Jeor BMR × 1.375 (light activity), −500 kcal to lose and +300 kcal to gain
- **Water**: 35 ml per kg (shown in 250 ml glasses, minimum 8)
- **Workout calories**: MET × weight (kg) × hours. For reps, active time is estimated at about 3–4 seconds per rep
- **Challenge**: start = last weigh-in on or before the 1st of the month; change % = (start − latest) / start × 100 (reversed for Healthy Gain)

## Scripts

```bash
npm start            # expo start
npm run typecheck    # tsc --noEmit
npx expo-doctor      # check dependency versions and config
```

## Troubleshooting

- **`npm install` fails with `ERR_SSL_CIPHER_OPERATION_FAILED`**: this is usually a flaky connection or low memory. Retry with
  `npm install --maxsockets=2`.
- **"Cloud is not set up yet"** on the login screen: `.env` is missing or empty. Fill it in and restart with `npx expo start -c`.
- **No login code in the email**: check the Magic Link template contains `{{ .Token }}`, and check your spam folder.
- **Group shows an error**: make sure you ran the whole `supabase/schema.sql`.
