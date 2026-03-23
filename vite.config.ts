import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const viteSupabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
    const viteSupabasePublishableKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      '';
    const viteTeyinatApiUrl = process.env.VITE_TEYINAT_API_URL || env.VITE_TEYINAT_API_URL || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': 'http://localhost:3001',
        },
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(viteSupabaseUrl),
        'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(viteSupabasePublishableKey),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(viteSupabasePublishableKey),
        'import.meta.env.VITE_TEYINAT_API_URL': JSON.stringify(viteTeyinatApiUrl),
        'process.env.API_KEY': JSON.stringify(''),
        'process.env.GEMINI_API_KEY': JSON.stringify('')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
