import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  supabaseUrl:
    (extra.supabaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    '',
  supabaseAnonKey:
    (extra.supabaseAnonKey as string | undefined) ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    '',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);
