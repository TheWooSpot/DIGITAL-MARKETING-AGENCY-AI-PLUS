import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Vite only exposes `VITE_*` to client code. On Vercel, older projects may still
 * only have `NEXT_PUBLIC_SUPABASE_*` set — map those at build time so shared
 * reports work without duplicating env vars.
 */
const viteSupabaseUrl =
  process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const viteSupabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const viteSiteUrl = process.env.VITE_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(viteSupabaseUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(viteSupabaseAnonKey),
    "import.meta.env.VITE_SITE_URL": JSON.stringify(viteSiteUrl),
  },
}));
