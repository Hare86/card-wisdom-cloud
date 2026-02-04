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
  if (cachedClient !== undefined) return cachedClient;

  const { url, key } = readEnv();
  if (!url || !key) {
    cachedClient = null;
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
    cachedClient = null;
    return null;
  }
};
