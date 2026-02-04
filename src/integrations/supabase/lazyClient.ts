import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SupabaseEnv = {
  url?: string;
  key?: string;
  projectId?: string;
};

const readEnv = (): SupabaseEnv => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
    (projectId ? `https://${projectId}.supabase.co` : undefined);

  const key =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON as string | undefined);

  return { url, key, projectId };
};

let cachedClient: SupabaseClient<Database> | null | undefined;

export const getBackendStatus = () => {
  const { url, key, projectId } = readEnv();
  const ready = Boolean(url && key);
  const reason = ready
    ? undefined
    : !url
      ? "Missing backend URL"
      : "Missing backend publishable key";

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
