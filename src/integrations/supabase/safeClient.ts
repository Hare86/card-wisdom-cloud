// Safe Supabase client wrapper.
// We do NOT edit the auto-generated `src/integrations/supabase/client.ts`,
// but some environments expose the anon key as `VITE_SUPABASE_PUBLISHABLE_KEY`.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (PROJECT_ID ? `https://${PROJECT_ID}.supabase.co` : undefined);

const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON as string | undefined);

if (!SUPABASE_URL) {
  console.error("Available env vars:", Object.keys(import.meta.env).filter(k => k.startsWith("VITE_")));
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID. Backend connection is not configured."
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase key (expected VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY)."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
