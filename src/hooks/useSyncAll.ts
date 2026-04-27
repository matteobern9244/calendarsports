import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STREAMING_PROVIDERS, STREAMING_FAMILIES } from "@/hooks/useStreamingData";
import {
  streamingApi,
  callEdgeFunctionWithMeta,
} from "@/lib/api/sportsApi";
import { todayRomeISO, addDaysISO } from "@/lib/dateUtils";
import { requiresWarning } from "@/hooks/syncWarning";
import {
  getCurrentSinnerSeason,
  getCurrentF1Season,
  getCurrentMotoGPSeason,
  getCurrentJuventusSeason,
  formatJuventusSeasonLabel,
} from "@/lib/currentSeason";

/**
 * Hook per sincronizzare tutti i dati dell'app, rispettando la "stagione
 * attiva per sport" calcolata da `currentSeason.ts`:
 *
 * 1. Rimuove dalla cache React Query tutte le chiavi sportive con stagione
 *    diversa da quella corrente (evita che `placeholderData` mostri dati
 *    della stagione precedente dopo un rollover).
 * 2. Prefetcha esplicitamente le query primarie di ciascun sport per la
 *    stagione corrente, leggendo l'envelope `meta.dataSource` per capire se
 *    le edge functions stanno servendo dati live o fallback statici.
 * 3. Aggiorna palinsesti TV e nuove uscite streaming.
 *
 * Espone stato granulare (syncing, syncStep, syncProgress) per indicatori
 * UI coerenti tra le pagine.
 */

type SportKey = "f1" | "juventus" | "sinner" | "motogp";

type PrefetchTask = {
  sport: SportKey;
  label: string; // mostrato nel toast/step
  queryKey: readonly unknown[];
  fn: string; // edge function name
  params: Record<string, string>;
  staleTime: number;
};

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

    // Stagioni correnti calcolate al volo
    const seasonF1 = getCurrentF1Season();
    const seasonJ = getCurrentJuventusSeason();
    const seasonS = getCurrentSinnerSeason();
    const seasonM = getCurrentMotoGPSeason();
    const seasonJLabel = formatJuventusSeasonLabel(seasonJ);

    // Mappa: per ogni sport, qual e' la stagione corrente. Usata per
    // ripulire dalla cache le chiavi con stagione diversa.
    const currentSeasonBySport: Record<SportKey, number> = {
      f1: seasonF1,
      juventus: seasonJ,
      sinner: seasonS,
      motogp: seasonM,
    };

    // Lista prefetch allineata agli hook in src/hooks/useSportsData.ts
    const tasks: PrefetchTask[] = [
      // F1
      { sport: "f1", label: `F1 ${seasonF1}`, queryKey: ["f1", "calendar", seasonF1], fn: "sports-f1", params: { action: "calendar", season: String(seasonF1) }, staleTime: 5 * 60 * 1000 },
      { sport: "f1", label: `F1 ${seasonF1}`, queryKey: ["f1", "driver-standings", seasonF1], fn: "sports-f1", params: { action: "driver-standings", season: String(seasonF1) }, staleTime: 5 * 60 * 1000 },
      { sport: "f1", label: `F1 ${seasonF1}`, queryKey: ["f1", "constructor-standings", seasonF1], fn: "sports-f1", params: { action: "constructor-standings", season: String(seasonF1) }, staleTime: 5 * 60 * 1000 },
      { sport: "f1", label: `F1 ${seasonF1}`, queryKey: ["f1", "next-race"], fn: "sports-f1", params: { action: "next-race" }, staleTime: 60 * 1000 },
      // Juventus
      { sport: "juventus", label: `Juventus ${seasonJLabel}`, queryKey: ["juventus", "standings", seasonJ], fn: "sports-football", params: { action: "standings", season: String(seasonJ) }, staleTime: 5 * 60 * 1000 },
      { sport: "juventus", label: `Juventus ${seasonJLabel}`, queryKey: ["juventus", "calendar", seasonJ, 1, 12], fn: "sports-football", params: { action: "calendar", season: String(seasonJ), page: "1", pageSize: "12" }, staleTime: 5 * 60 * 1000 },
      { sport: "juventus", label: `Juventus ${seasonJLabel}`, queryKey: ["juventus", "info", seasonJ], fn: "sports-football", params: { action: "next-match", season: String(seasonJ) }, staleTime: 60 * 1000 },
      // Sinner
      { sport: "sinner", label: `Sinner ${seasonS}`, queryKey: ["sinner", "info"], fn: "sports-tennis", params: { action: "player-info" }, staleTime: 30 * 60 * 1000 },
      { sport: "sinner", label: `Sinner ${seasonS}`, queryKey: ["sinner", "next-event"], fn: "sports-tennis", params: { action: "next-event", season: String(seasonS) }, staleTime: 60 * 1000 },
      { sport: "sinner", label: `Sinner ${seasonS}`, queryKey: ["sinner", "schedule", seasonS], fn: "sports-tennis", params: { action: "schedule", season: String(seasonS) }, staleTime: 5 * 60 * 1000 },
      { sport: "sinner", label: `Sinner ${seasonS}`, queryKey: ["sinner", "results", seasonS], fn: "sports-tennis", params: { action: "results", season: String(seasonS) }, staleTime: 5 * 60 * 1000 },
      // MotoGP
      { sport: "motogp", label: `MotoGP ${seasonM}`, queryKey: ["motogp", "calendar", seasonM], fn: "sports-motogp", params: { action: "calendar", season: String(seasonM) }, staleTime: 5 * 60 * 1000 },
      { sport: "motogp", label: `MotoGP ${seasonM}`, queryKey: ["motogp", "next-event"], fn: "sports-motogp", params: { action: "next-event", season: String(seasonM) }, staleTime: 60 * 1000 },
      { sport: "motogp", label: `MotoGP ${seasonM}`, queryKey: ["motogp", "standings", seasonM], fn: "sports-motogp", params: { action: "standings", season: String(seasonM) }, staleTime: 5 * 60 * 1000 },
      { sport: "motogp", label: `MotoGP ${seasonM}`, queryKey: ["motogp", "constructor-standings", seasonM], fn: "sports-motogp", params: { action: "constructor-standings", season: String(seasonM) }, staleTime: 5 * 60 * 1000 },
    ];

    const sportLabel: Record<SportKey, string> = {
      f1: `F1 ${seasonF1}`,
      juventus: `Juventus ${seasonJLabel}`,
      sinner: `Sinner ${seasonS}`,
      motogp: `MotoGP ${seasonM}`,
    };

    // Accumulatore per warning su dataSource non-live
    const fallbackBySport: Record<SportKey, Set<string>> = {
      f1: new Set(),
      juventus: new Set(),
      sinner: new Set(),
      motogp: new Set(),
    };

    try {
      // === Step 1: rimuovi cache stagioni obsolete dei 4 sport ===
      setSyncStep("Pulizia cache stagioni obsolete...");
      toast.loading("Pulizia cache stagioni obsolete...", { id: toastId });
      queryClient.removeQueries({
        predicate: (q) => {
          const key = q.queryKey;
          if (!Array.isArray(key) || key.length < 2) return false;
          const sport = key[0];
          if (sport !== "f1" && sport !== "juventus" && sport !== "sinner" && sport !== "motogp") return false;
          // Cerca un numero (anno 4 cifre) nella key
          const seasonInKey = key.find((part) => typeof part === "number" && part >= 2000 && part <= 2100) as number | undefined;
          if (seasonInKey === undefined) return false; // chiavi senza stagione (es. ["f1","next-race"]) restano
          return seasonInKey !== currentSeasonBySport[sport as SportKey];
        },
      });
      setSyncProgress(8);

      // === Step 2: prefetch sport per la stagione corrente ===
      const sports: SportKey[] = ["f1", "juventus", "sinner", "motogp"];
      let done = 0;
      for (const sp of sports) {
        const sportTasks = tasks.filter((t) => t.sport === sp);
        setSyncStep(`Aggiorno ${sportLabel[sp]}...`);
        toast.loading(`Aggiorno ${sportLabel[sp]}...`, { id: toastId });
        await Promise.all(
          sportTasks.map(async (t) => {
            try {
              const { data, meta } = await callEdgeFunctionWithMeta(t.fn, t.params);
              queryClient.setQueryData(t.queryKey, data);
              if (requiresWarning(meta)) {
                fallbackBySport[sp].add(meta?.dataSource ?? "unknown");
              }
            } catch (err) {
              console.warn(`Sync ${sp} ${JSON.stringify(t.params)} failed:`, err);
              fallbackBySport[sp].add("error");
            }
          }),
        );
        done += 1;
        // F1->15%, Juve->30%, Sinner->45%, MotoGP->60%
        setSyncProgress(8 + Math.round(done * 13));
      }

      // === Step 2bis: Highlights YouTube (Juventus, F1, MotoGP) ===
      setSyncStep("Aggiornamento highlights YouTube...");
      toast.loading("Aggiornamento highlights YouTube...", { id: toastId });
      await Promise.all(
        (["juventus", "f1", "motogp"] as const).map(async (sport) => {
          try {
            const { data, meta } = await callEdgeFunctionWithMeta(
              "highlights-youtube",
              { sport, limit: "12" },
            );
            queryClient.setQueryData(["highlights", sport, 12], data);
            if (requiresWarning(meta)) {
              fallbackBySport[sport].add(meta?.dataSource ?? "unknown");
            }
          } catch (err) {
            console.warn(`Sync highlights ${sport} failed:`, err);
            fallbackBySport[sport].add("error");
          }
        }),
      );
      setSyncProgress(70);

      // === Step 3: Juventus calendar — tutte le pagine ===
      setSyncStep("Aggiornamento calendario Juventus completo...");
      toast.loading("Aggiornamento calendario Juventus completo...", { id: toastId });
      const firstPage = queryClient.getQueryData<{ totalPages?: number }>(
        ["juventus", "calendar", seasonJ, 1, 12],
      );
      const totalPages = Math.min(10, firstPage?.totalPages ?? 1);
      if (totalPages > 1) {
        await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (p) => {
            try {
              const { data } = await callEdgeFunctionWithMeta("sports-football", {
                action: "calendar",
                season: String(seasonJ),
                page: String(p),
                pageSize: "12",
              });
              queryClient.setQueryData(["juventus", "calendar", seasonJ, p, 12], data);
            } catch (err) {
              console.warn(`Sync juventus calendar page ${p} failed:`, err);
            }
          }),
        );
      }
      setSyncProgress(78);

      // === Step 4: palinsesti TV — prefetch reale 5 famiglie ===
      setSyncStep("Aggiornamento palinsesti TV...");
      toast.loading("Aggiornamento palinsesti TV...", { id: toastId });
      await Promise.all(
        STREAMING_FAMILIES.map((f) =>
          queryClient.prefetchQuery({
            queryKey: ["streaming-tv", f.id],
            queryFn: () => streamingApi.getTvByFamily(f.id),
            staleTime: 0,
          }),
        ),
      );
      setSyncProgress(88);

      // === Step 5: nuove uscite streaming (Catalogo Italia) ===
      // Prefetch della stessa query usata dalla pagina /streaming?tab=releases:
      // `new-italy` con i 4 provider IT (Tutti + singoli) sulla finestra di
      // default 7gg, in modo che "Sincronizza" scaldi davvero la cache che
      // l'utente vedrà al primo render.
      setSyncStep("Aggiornamento nuove uscite streaming...");
      toast.loading("Aggiornamento nuove uscite streaming...", { id: toastId });
      const today = todayRomeISO();
      const dateTo7 = addDaysISO(today, 7);
      const italyProviderIds: Array<"all" | (typeof STREAMING_PROVIDERS)[number]["id"]> = [
        "all",
        ...STREAMING_PROVIDERS.map((p) => p.id),
      ];
      await Promise.all(
        italyProviderIds.map((pid) =>
          queryClient.prefetchQuery({
            queryKey: [
              "streaming-releases-italy",
              pid,
              "all",
              today,
              dateTo7,
              "release",
              0,
            ],
            queryFn: () =>
              streamingApi.getReleasesItaly({
                provider: pid,
                kind: "all",
                dateFrom: today,
                dateTo: dateTo7,
                sort: "release",
              }),
            staleTime: 0,
          }),
        ),
      );
      setSyncProgress(100);
      setLastSyncAt(new Date());

      // Toast finale: success se tutto live, warning se ci sono fallback
      const sportsWithFallback = (Object.keys(fallbackBySport) as SportKey[]).filter(
        (sp) => fallbackBySport[sp].size > 0,
      );
      if (sportsWithFallback.length === 0) {
        toast.success("Tutti i dati sono stati aggiornati!", { id: toastId });
      } else {
        const list = sportsWithFallback.map((sp) => sportLabel[sp]).join(", ");
        toast.warning(
          `Sincronizzazione completata. Dati non live per: ${list}. Riprova più tardi.`,
          { id: toastId, duration: 8000 },
        );
      }
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
