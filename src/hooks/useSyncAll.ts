import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STREAMING_PROVIDERS } from "@/hooks/useStreamingData";
import { streamingApi } from "@/lib/api/sportsApi";
import { todayRomeISO, addDaysISO } from "@/lib/dateUtils";

/**
 * Hook per sincronizzare tutti i dati dell'app:
 * 1. Dati sportivi (F1, MotoGP, Sinner, Juventus, ecc.)
 * 2. Palinsesti TV (5 famiglie streaming)
 * 3. Nuove uscite streaming (prefetch per i prossimi 14 giorni)
 *
 * Espone stato granulare (syncing, syncStep, syncProgress) per
 * mostrare indicatori UI coerenti tra pagine diverse.
 */
export function useSyncAll() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<string>("");
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

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
      setLastSyncAt(new Date());

      toast.success("Tutti i dati sono stati aggiornati!", { id: toastId });
    } catch {
      toast.error("Errore durante la sincronizzazione", { id: toastId });
    } finally {
      setSyncStep("");
      setSyncing(false);
      setTimeout(() => setSyncProgress(0), 600);
    }
  }, [queryClient]);

  return { sync, syncing, syncStep, syncProgress };
}
