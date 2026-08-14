import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  supabaseUrl: (
    (extra.supabaseUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    ''
  ).trim(),
  supabaseAnonKey: (
    (extra.supabaseAnonKey as string | undefined) ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim(),
  openaiApiKey:
    (extra.openaiApiKey as string | undefined) ??
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ??
    '',
  openaiModel:
    (extra.openaiModel as string | undefined) ??
    process.env.EXPO_PUBLIC_OPENAI_MODEL ??
    'gpt-4o-mini',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);

export const isOpenAIConfigured = Boolean(config.openaiApiKey);
