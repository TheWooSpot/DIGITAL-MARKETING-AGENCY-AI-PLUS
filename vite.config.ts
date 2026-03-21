import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Client-visible env — use `VITE_*` only (set in Vercel → Environment Variables). */
const viteDiagnosticUrl = process.env.VITE_DIAGNOSTIC_URL ?? "";
const viteSupabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const viteSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const viteSiteUrl = process.env.VITE_SITE_URL ?? "";

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
    "import.meta.env.VITE_DIAGNOSTIC_URL": JSON.stringify(viteDiagnosticUrl),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(viteSupabaseUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(viteSupabaseAnonKey),
    "import.meta.env.VITE_SITE_URL": JSON.stringify(viteSiteUrl),
  },
}));
