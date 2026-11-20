// Values come from the .env file (see .env.example). EXPO_PUBLIC_* variables are
// inlined at build time. The Supabase anon key is designed to be public; Row
// Level Security in supabase/schema.sql is what protects the data.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
