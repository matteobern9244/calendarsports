// Safe Supabase client wrapper.
//
// In production builds the Vite env vars (`VITE_SUPABASE_URL`,
// `VITE_SUPABASE_PUBLISHABLE_KEY`) may not be injected into the bundle,
// which causes the auto-generated `src/integrations/supabase/client.ts`
// to instantiate a broken client (URL/key === undefined).
//
// We re-create the client here using the same public anon key as
// fallback, so any direct call to the Supabase JS SDK (auth, realtime,
// functions.invoke, storage, db) keeps working even when env vars are
// missing at build time.
//
// The auto-generated `client.ts` is read-only and must not be edited;
// new code should import `supabase` from THIS file instead.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public values — safe to expose in a client bundle.
const FALLBACK_SUPABASE_URL = "https://jxijruuclgskxlbqittk.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aWpydXVjbGdza3hsYnFpdHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDc1ODksImV4cCI6MjA5MDM4MzU4OX0.DHIimVDItkhF1o9e6NK71BKjNkVP2EHsJpJyJIqgiSE";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;
