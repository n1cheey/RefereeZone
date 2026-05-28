export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
};

export const missingEnvMessages = [
  !env.supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL is missing.' : null,
  !env.supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.' : null,
  !env.apiBaseUrl ? 'EXPO_PUBLIC_API_BASE_URL is missing.' : null,
].filter(Boolean) as string[];

export const hasEnvConfig = missingEnvMessages.length === 0;
