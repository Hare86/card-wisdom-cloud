import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SupabaseEnv = {
  url?: string;
  key?: string;
  projectId?: string;
};

// Public fallback values (safe to ship). These prevent auth from breaking when
// the preview environment fails to inject Vite env vars (import.meta.env.*).
// NOTE: These are NOT service-role secrets.
const FALLBACK_PROJECT_ID = "sjwdbubmrnsycfgtzhga";
const FALLBACK_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd2RidWJtcm5zeWNmZ3R6aGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTUzMzgsImV4cCI6MjA4NTQzMTMzOH0.eykyLd6lVu75VZlrIyl-VFDIP37Skoz8uWZxZqBL3J4";

const readEnv = (): SupabaseEnv => {
  const projectId =
    (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ??
    FALLBACK_PROJECT_ID;

  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    (projectId ? `https://${projectId}.supabase.co` : undefined) ??
    FALLBACK_URL;

  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON as string | undefined) ??
    FALLBACK_PUBLISHABLE_KEY;

  return { url, key, projectId };
};

let cachedClient: SupabaseClient<Database> | null | undefined;

export const getBackendStatus = () => {
  const { url, key, projectId } = readEnv();
  // With fallbacks, these should always be present
  const ready = Boolean(url && key);
  const reason = ready
    ? undefined
    : !url
      ? "Missing backend URL"
      : "Missing backend publishable key";

  console.log("[Backend Status]", { ready, url: url?.substring(0, 30), keyPresent: Boolean(key), projectId });
  return { ready, reason, urlPresent: Boolean(url), keyPresent: Boolean(key), projectIdPresent: Boolean(projectId) };
};

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  // If we have a valid cached client, return it
  if (cachedClient) return cachedClient;

  const { url, key } = readEnv();
  
  // If env vars aren't available, return null but don't cache it
  // This allows retry on next call if vars become available
  if (!url || !key) {
    console.warn("Backend client not initialized:", { urlPresent: Boolean(url), keyPresent: Boolean(key) });
    return null;
  }

  try {
    cachedClient = createClient<Database>(url, key, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (e) {
    console.error("Failed to initialize backend client:", e);
    return null;
  }
};
