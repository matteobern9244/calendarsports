// Client Supabase dell'app: l'unico punto da cui si importa.
//
// Dal 9 ottobre 2026 il backend e' un progetto Supabase personale. Il progetto
// Lovable resta collegato al suo Lovable Cloud, che continua a generare
// `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) e
// `src/integrations/supabase/client.ts` con l'indirizzo del progetto vecchio, e
// li riscrive a ogni modifica fatta dal suo agente. Per questo qui URL e chiave
// sono costanti e le variabili d'ambiente non si leggono: se le leggessimo, la
// build di Lovable riporterebbe l'app sul database vecchio senza nessun errore.
//
// Il guardiano e' `src/test/tooling/supabaseProject.test.ts`.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Valori pubblici: la anon key finisce comunque nel bundle del browser, e
// l'accesso ai dati lo decidono le policy RLS, non la segretezza della chiave.
const SUPABASE_URL = "https://jhrpalouxwntkimacqkg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocnBhbG91eHdudGtpbWFjcWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTExMTgsImV4cCI6MjEwNzA2NzExOH0.lBuPqLr_XsRLppIwZhrL8kzE_wchOuaeGL6VMU0WdIQ";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;
