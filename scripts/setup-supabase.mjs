// One-command Supabase setup for Health Tracker (README steps 1–4).
//
//   1. Create a personal access token: https://supabase.com/dashboard/account/tokens
//   2. Add it to .env:   SUPABASE_ACCESS_TOKEN=sbp_...
//      (optional) SUPABASE_PROJECT_REF=abcdefghijklmnopqrst   → use an existing project instead of creating one
//      (optional) GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...  → also enable Google sign-in
//   3. Run:  npm run setup:supabase
//
// It creates the project (Mumbai region), runs supabase/schema.sql, configures the
// login-code email + redirect URLs, and writes EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY into .env.
// Non-EXPO_PUBLIC values in .env are never bundled into the app, and .env is gitignored.

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const API = 'https://api.supabase.com';

function readEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function writeEnv(updates) {
  let text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, `${k}=${v}`) : `${text.replace(/\s*$/, '\n')}${k}=${v}\n`;
  }
  writeFileSync(envPath, text);
}

const env = { ...readEnv(), ...process.env };
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token || !token.startsWith('sbp_')) {
  console.error('✖ Add SUPABASE_ACCESS_TOKEN=sbp_... to .env first (https://supabase.com/dashboard/account/tokens).');
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // ---- 1. Project ----
  let ref = env.SUPABASE_PROJECT_REF;
  if (!ref) {
    // Reuse a project the user already made (free plan allows only 2), e.g. "Health Tracker".
    const projects = await api('GET', '/v1/projects').catch(() => []);
    const existing = (projects ?? []).find((p) => /heal/i.test(p.name ?? ''));
    if (existing) {
      ref = existing.ref ?? existing.id;
      writeEnv({ SUPABASE_PROJECT_REF: ref });
    }
  }
  if (!ref) {
    const orgs = await api('GET', '/v1/organizations');
    if (!orgs?.length) throw new Error('No Supabase organization found. Open the dashboard once to create one.');
    const org = orgs.find((o) => o.slug === env.SUPABASE_ORG) ?? orgs[0];
    const dbPass = env.SUPABASE_DB_PASSWORD || randomBytes(18).toString('base64url');
    const base = { name: 'health-tracker', organization_slug: org.slug, db_pass: dbPass };
    console.log(`• Creating project "health-tracker" in organization "${org.name}" (Mumbai)…`);
    let project;
    try {
      project = await api('POST', '/v1/projects', {
        ...base,
        region_selection: { type: 'specific', code: env.SUPABASE_REGION || 'ap-south-1' },
      });
    } catch (e) {
      if (e.status !== 400 && e.status !== 422) throw e;
      project = await api('POST', '/v1/projects', { ...base, region: env.SUPABASE_REGION || 'ap-south-1' });
    }
    ref = project.ref ?? project.id;
    // Save immediately so a re-run reuses this project instead of creating another.
    writeEnv({ SUPABASE_PROJECT_REF: ref, SUPABASE_DB_PASSWORD: dbPass });
    console.log(`  ✓ Project ref ${ref} (database password saved in .env)`);
  } else {
    console.log(`• Using existing project ${ref}`);
  }

  // ---- 2. Wait until healthy ----
  process.stdout.write('• Waiting for the project to start');
  for (let i = 0; ; i++) {
    const p = await api('GET', `/v1/projects/${ref}`);
    if (p.status === 'ACTIVE_HEALTHY') break;
    if (['INIT_FAILED', 'REMOVED', 'INACTIVE'].includes(p.status)) throw new Error(`Project status is ${p.status}`);
    if (i > 80) throw new Error('Project did not become healthy in ~13 minutes. Re-run this script later.');
    process.stdout.write('.');
    await sleep(10_000);
  }
  console.log(' ✓');

  // ---- 3. Schema ----
  console.log('• Running supabase/schema.sql…');
  const schema = readFileSync(join(root, 'supabase', 'schema.sql'), 'utf8');
  for (let i = 0; ; i++) {
    try {
      await api('POST', `/v1/projects/${ref}/database/query`, { query: schema });
      break;
    } catch (e) {
      // The database can lag a little behind ACTIVE_HEALTHY right after creation.
      if (i >= 5) throw e;
      await sleep(10_000);
    }
  }
  const check = await api('POST', `/v1/projects/${ref}/database/query`, {
    query:
      "select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in " +
      "('profiles','weight_logs','workouts','sleep_logs','water_logs','step_logs','targets','reminders','groups','group_members','cheers')",
    read_only: true,
  });
  const n = Array.isArray(check) ? check[0]?.n : undefined;
  console.log(`  ✓ Schema applied${n != null ? ` (${n}/11 tables present)` : ''}`);

  // ---- 4. Auth: login code email, redirect URLs, optional Google ----
  console.log('• Configuring login (6-digit email code, redirect URLs)…');
  const auth = {
    site_url: 'healthtracker://',
    uri_allow_list: 'exp://**,healthtracker://**',
    mailer_otp_length: 6,
    mailer_subjects_magic_link: 'Your Health Tracker login code',
    mailer_templates_magic_link_content:
      '<h2>Health Tracker</h2><p>Your login code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p><p>Enter this code in the app. It expires soon.</p>',
  };
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    Object.assign(auth, {
      external_google_enabled: true,
      external_google_client_id: env.GOOGLE_CLIENT_ID,
      external_google_secret: env.GOOGLE_CLIENT_SECRET,
    });
  }
  try {
    await api('PATCH', `/v1/projects/${ref}/config/auth`, auth);
  } catch (e) {
    // Free plan + default email sender: templates are locked. The app then uses the login link instead.
    if (!String(e.message).includes('entitlement_required')) throw e;
    delete auth.mailer_subjects_magic_link;
    delete auth.mailer_templates_magic_link_content;
    await api('PATCH', `/v1/projects/${ref}/config/auth`, auth);
    console.log('  ! Free plan: email template is locked, so login uses the emailed link (tap it on the phone).');
  }
  console.log(`  ✓ Auth configured${auth.external_google_enabled ? ' (Google enabled)' : ' (Google: skipped — no GOOGLE_CLIENT_ID/SECRET)'}`);

  // ---- 5. Keys → .env ----
  const keys = await api('GET', `/v1/projects/${ref}/api-keys?reveal=true`);
  const anon =
    keys.find((k) => k.name === 'anon')?.api_key ??
    keys.find((k) => k.type === 'publishable')?.api_key;
  if (!anon) throw new Error('Could not find the anon / publishable key.');
  writeEnv({ EXPO_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`, EXPO_PUBLIC_SUPABASE_ANON_KEY: anon });
  console.log('  ✓ .env updated with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');

  console.log('\n✅ Supabase is ready. Restart Expo with:  npx expo start -c');
  if (!auth.external_google_enabled) {
    console.log(
      `   Google sign-in: add redirect URI https://${ref}.supabase.co/auth/v1/callback to a Google OAuth client,\n` +
        '   put GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env and run this script again.',
    );
  }
}

main().catch((e) => {
  console.error('\n✖ ' + (e.message ?? e));
  process.exit(1);
});
