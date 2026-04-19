import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STREAMING_PROVIDERS } from "@/hooks/useStreamingData";
import { streamingApi } from "@/lib/api/sportsApi";
import { todayRomeISO, addDaysISO } from "@/lib/dateUtils";

const LAST_SYNC_KEY = "calendarsports:lastSyncAt";

// Legge il timestamp persistito da localStorage. Ritorna null se mancante,
// invalido o se localStorage non e' disponibile (SSR / sandbox).
function readPersistedSyncAt(): Date | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    const ms = Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms);
  } catch {
    return null;
  }
}

// Persistenza fail-safe: ignora quota errors e ambienti senza storage.
function writePersistedSyncAt(date: Date): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_SYNC_KEY, String(date.getTime()));
  } catch {
    // ignore
  }
}

/**
 * Hook per sincronizzare tutti i dati dell'app:
 * 1. Dati sportivi (F1, MotoGP, Sinner, Juventus, ecc.)
 * 2. Palinsesti TV (5 famiglie streaming)
 * 3. Nuove uscite streaming (prefetch per i prossimi 14 giorni)
 *
 * Espone stato granulare (syncing, syncStep, syncProgress) per
 * mostrare indicatori UI coerenti tra pagine diverse.
 *
 * `lastSyncAt` viene persistito in localStorage cosi' rimane condiviso
 * tra Home e Streaming e sopravvive ai refresh; le modifiche fatte in
 * un'altra tab vengono propagate via `storage` event.
 */
export function useSyncAll() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<string>("");
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(() => readPersistedSyncAt());

  // Mantieni allineate piu' istanze dell'hook (Home + Streaming + altre tab).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_SYNC_KEY) return;
      setLastSyncAt(readPersistedSyncAt());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncProgress(0);
    const toastId = toast.loading("Avvio sincronizzazione...");
    try {
      // 1. Sport
      setSyncStep("Aggiornamento dati sportivi...");
      toast.loading("Aggiornamento dati sportivi...", { id: toastId });
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey?.[0];
          return typeof k === "string" && !k.startsWith("streaming-");
        },
        refetchType: "all",
      });
      setSyncProgress(33);

      // 2. Palinsesti TV
      setSyncStep("Aggiornamento palinsesti TV...");
      toast.loading("Aggiornamento palinsesti TV...", { id: toastId });
      await queryClient.invalidateQueries({
        queryKey: ["streaming-tv"],
        refetchType: "all",
      });
      setSyncProgress(66);

      // 3. Nuove uscite streaming
      setSyncStep("Aggiornamento nuove uscite streaming...");
      toast.loading("Aggiornamento nuove uscite streaming...", { id: toastId });
      const today = todayRomeISO();
      const dateTo = addDaysISO(today, 14);
      await Promise.all(
        STREAMING_PROVIDERS.map((p) =>
          queryClient.prefetchQuery({
            queryKey: ["streaming-releases", p.id, today, dateTo],
            queryFn: () => streamingApi.getReleasesByProvider(p.id, today, dateTo),
            staleTime: 0,
          }),
        ),
      );
      setSyncProgress(100);
      const now = new Date();
      setLastSyncAt(now);
      writePersistedSyncAt(now);

      toast.success("Tutti i dati sono stati aggiornati!", { id: toastId });
    } catch {
      toast.error("Errore durante la sincronizzazione", { id: toastId });
    } finally {
      setSyncStep("");
      setSyncing(false);
      setTimeout(() => setSyncProgress(0), 600);
    }
  }, [queryClient]);

  return { sync, syncing, syncStep, syncProgress, lastSyncAt };
}
