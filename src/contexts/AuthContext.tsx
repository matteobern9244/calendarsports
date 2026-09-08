import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { AuthContext, type AuthContextValue } from "./useAuth";

/**
 * Sessione utente condivisa. Chi non ha effettuato l'accesso vede
 * l'applicazione esattamente come prima: `session` resta `null` e nessuna
 * query verso il profilo viene eseguita.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prima il listener, poi la lettura iniziale: così nessun evento di
    // login che arriva durante il primo giro va perso.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: current } }) => {
        setSession(current);
      })
      .finally(() => setLoading(false));

    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signOut }),
    [session, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
