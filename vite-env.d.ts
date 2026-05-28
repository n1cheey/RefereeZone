/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_TEYINAT_API_URL?: string;
  readonly VITE_DEFAULT_SEASON?: '2025-2026' | '2026-2027';
  readonly VITE_APP_STAGE?: 'local' | 'preview' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
