/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { getBackendStatus, getSupabaseClient } from "@/integrations/supabase/lazyClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const sb = getSupabaseClient();
    if (!sb) {
      const status = getBackendStatus();
      console.warn("Backend not configured; auth disabled:", status);
      setLoading(false);
      return;
    }

    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("Auth initialization timeout, continuing without session");
        setLoading(false);
      }
    }, 3000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = sb.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    );

    // THEN check for existing session
    sb.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          clearTimeout(timeout);
        }
      })
      .catch((error) => {
        console.error("Failed to get session:", error);
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const sb = getSupabaseClient();
    if (!sb) return { error: new Error("Backend not configured") };
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const sb = getSupabaseClient();
    if (!sb) return { error: new Error("Backend not configured") };
    const { error } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
