import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import EventCard from "@/components/common/EventCard";
import DataSection, { type ExternalSource } from "@/components/common/DataSection";
import OfflinePageFallback from "@/components/common/OfflinePageFallback";
import SportTabs from "@/components/common/SportTabs";
import PlayerHeader from "@/components/sinner/PlayerHeader";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { TennisMatch } from "@/lib/api/schemas";
import { getCurrentSinnerSeason } from "@/lib/currentSeason";
import { allSectionsUnavailable } from "@/lib/offlineSections";
import { useSinnerInfo, useSinnerResults, useSinnerSchedule } from "@/hooks/useSportsData";
import { tennisApi } from "@/lib/api/sportsApi";
import { formatDateIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "risultati", label: "Risultati" },
  { value: "tornei", label: "Tornei" },
] as const;

// Numero di risultati per pagina lato UI. Volutamente piccolo (4) per
// mostrare in vista solo le ultime quattro schede di match e demandare
// tutto il resto alla paginazione, riducendo la verticalita' della
// pagina e velocizzando la scansione visiva. Il backend (`supabase/
// functions/sports-tennis`, action `results`) accetta `pageSize`
// arbitrario, quindi non serve allineamento server-side.
const RESULTS_PAGE_SIZE = 4;

const RESULTS_SOURCE: ExternalSource = {
  href: "https://www.atptour.com/en/players/jannik-sinner/s0ag/overview",
  label: "Vedi risultati su ATP Tour",
  loadingLabel: "Scopri ora su ATP Tour",
};

const SCHEDULE_SOURCE: ExternalSource = {
  href: "https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity",
  label: "Vedi calendario su ATP Tour",
  loadingLabel: "Scopri ora su ATP Tour",
};

export default function SinnerPage() {
  const season = getCurrentSinnerSeason();
  const [resultsPage, setResultsPage] = useState(1);
  const queryClient = useQueryClient();
  const { data: playerInfo } = useSinnerInfo();
  const {
    data: results,
    isLoading: resLoading,
    isFetching: resFetching,
    error: resError,
    refetch: resRefetch,
  } = useSinnerResults(season, resultsPage, RESULTS_PAGE_SIZE);
  const {
    data: schedule,
    isLoading: schLoading,
    error: schError,
    refetch: schRefetch,
  } = useSinnerSchedule(season);
  const { isOnline } = useOnlineStatus();

  // Reset paginazione quando cambia la stagione: pagine alte di una
  // stagione precedente non hanno senso per la nuova. Confrontato con il
  // render precedente invece che in un effect, che scatterebbe anche al mount.
  const [prevSeason, setPrevSeason] = useState(season);
  if (prevSeason !== season) {
    setPrevSeason(season);
    setResultsPage(1);
  }

  // Compatibilita' di forma: il backend ora restituisce
  // `{ items, pagination }`, ma per sicurezza accettiamo anche il
  // vecchio shape `MatchRow[]` (es. cache stale o fallback).
  const resultItems: TennisMatch[] = Array.isArray(results) ? results : (results?.items ?? []);
  const resultsPagination =
    !Array.isArray(results) && results?.pagination ? results.pagination : null;

  // Prefetch della pagina successiva: appena i dati della pagina
  // corrente arrivano e sappiamo quante pagine totali esistono,
  // chiediamo silenziosamente a React Query di scaricare anche la
  // pagina N+1. Quando l'utente clicca "Successiva" i dati sono gia'
  // in cache e la transizione e' istantanea (niente overlay di
  // caricamento, niente sfarfallio). Il prefetch e' deduplicato dal
  // queryClient: chiamarlo piu' volte sulla stessa chiave non genera
  // richieste extra.
  const totalResultPages = resultsPagination?.totalPages ?? 0;
  useEffect(() => {
    if (!totalResultPages) return;
    const nextPage = resultsPage + 1;
    if (nextPage > totalResultPages) return;
    queryClient.prefetchQuery({
      queryKey: ["sinner", "results", season, nextPage, RESULTS_PAGE_SIZE],
      queryFn: () => tennisApi.getResults(season, nextPage, RESULTS_PAGE_SIZE),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, season, resultsPage, totalResultPages]);

  // `playerInfo` non traccia un errore: entra nella condizione solo con i
  // suoi dati, com'era scritto qui prima di `allSectionsUnavailable`.
  const sezioni = [
    { data: results, error: resError },
    { data: schedule, error: schError },
    { data: playerInfo },
  ];
  if (!isOnline && allSectionsUnavailable(sezioni)) {
    return (
      <OfflinePageFallback
        onRetry={() => {
          resRefetch();
          schRefetch();
        }}
      />
    );
  }

  return (
    <SportTabs
      title="Jannik Sinner"
      defaultValue="risultati"
      tabs={TABS}
      // `SinnerPage` ha due sole schede e una lista piu' semplice delle
      // altre tre pagine: uniformarla sarebbe un cambiamento visivo che
      // nessuno ha chiesto.
      listClassName="mb-6 bg-muted"
      beforeTabs={
        <>
          {/* Player header with photo, ranking, season stats */}
          {playerInfo && (
            <PlayerHeader
              name={playerInfo.name}
              ranking={typeof playerInfo.ranking === "number" ? playerInfo.ranking : null}
              rankingDate={playerInfo.rankingDate}
              careerHigh={playerInfo.careerHigh}
              nationality={playerInfo.nationality}
              height={playerInfo.height}
              weight={playerInfo.weight}
              birthPlace={playerInfo.birthPlace}
              plays={playerInfo.plays}
              coach={playerInfo.coach}
              seasonRecord={playerInfo.seasonRecord}
              seasonTitles={playerInfo.seasonTitles}
              photoUrl={playerInfo.photoUrl}
              source={playerInfo.source}
              statsUpdatedAt={playerInfo.statsUpdatedAt}
              slamResults={playerInfo.slamResults}
            />
          )}
        </>
      }
    >
      <TabsContent value="risultati">
        <DataSection
          isLoading={resLoading}
          error={resError}
          isEmpty={resultItems.length === 0}
          source={RESULTS_SOURCE}
          loadingMessage="Caricamento risultati..."
          errorMessage={`Risultati stagione ${season} non disponibili`}
          errorDetail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta lo storico ufficiale dei match di Jannik Sinner sul sito ATP Tour."
          errorCtaHint="Tocca qui per i punteggi set per set ufficiali"
          onRetry={() => resRefetch()}
          emptyTitle={`Risultati stagione ${season}`}
          emptyDescription="I risultati dei match di Jannik Sinner per questa stagione non sono ancora stati pubblicati dalla nostra fonte. Apri il profilo ufficiale ATP qui sotto per consultare lo storico completo delle partite, i punteggi set per set e le statistiche aggiornate."
          emptyCtaHint="Tocca qui per i punteggi set per set"
        >
          {(() => {
            const { items: orderedResults, highlightIndex } = prioritizeNextUpcoming(
              resultItems,
              (result) => result.date,
            );
            // Quando React Query sta gia' fetchando una nuova pagina ma
            // sta ancora mostrando i dati precedenti (`placeholderData`),
            // segnaliamo lo stato di caricamento sia visivamente
            // (overlay attenuato + spinner) sia per gli screen reader
            // (`role="status"` con `aria-live="polite"`). Cosi' l'utente
            // capisce che la lista in vista e' ancora quella vecchia in
            // attesa dell'aggiornamento.
            const isPageChanging = resFetching && !resLoading;
            return (
              <>
                <div className="relative">
                  {isPageChanging && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-xs"
                    >
                      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-md">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                        <span className="text-xs font-heading uppercase tracking-wider text-foreground">
                          Caricamento risultati...
                        </span>
                      </div>
                    </div>
                  )}
                  <motion.div
                    className={cn(
                      "grid gap-4 sm:grid-cols-2 transition-opacity duration-200",
                      isPageChanging && "opacity-50 pointer-events-none",
                    )}
                    aria-busy={isPageChanging}
                    initial="hidden"
                    animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                  >
                    {orderedResults.map((r, i) => (
                      <EventCard
                        key={i}
                        sport={r.tournament || "ATP"}
                        title={
                          r.opponent
                            ? `vs. ${r.opponent}${r.opponentRank ? ` (#${r.opponentRank})` : ""}`
                            : r.tournament
                        }
                        subtitle={
                          r.round ? `${r.round}${r.surface ? ` · ${r.surface}` : ""}` : r.surface
                        }
                        date={r.date ? formatDateIT(r.date) : "—"}
                        startDate={r.date}
                        status={r.date ? getEventStatus(r.date) : "completato"}
                        highlight={i === highlightIndex}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.result && (
                            <span
                              className={cn(
                                "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-xs font-heading font-bold",
                                r.result === "V"
                                  ? "bg-success/15 text-success border border-success/30"
                                  : "bg-destructive/15 text-destructive border border-destructive/30",
                              )}
                              aria-label={r.result === "V" ? "Vittoria" : "Sconfitta"}
                            >
                              {r.result}
                            </span>
                          )}
                          {r.score && (
                            <p className="text-sm font-heading font-bold text-foreground">
                              {r.score}
                            </p>
                          )}
                        </div>
                      </EventCard>
                    ))}
                  </motion.div>
                </div>
                {resultsPagination && resultsPagination.totalPages > 1 && (
                  <nav
                    aria-label="Paginazione risultati"
                    className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-border/40"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                      disabled={resultsPagination.page <= 1 || resFetching}
                      className="h-9 px-3 gap-1 text-xs font-heading uppercase tracking-wider"
                      aria-label="Pagina precedente dei risultati"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Precedente</span>
                    </Button>
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="text-[11px] sm:text-xs font-heading uppercase tracking-wider text-muted-foreground text-center"
                    >
                      Pagina {resultsPagination.page} / {resultsPagination.totalPages} ·{" "}
                      {resultsPagination.total} risultati
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setResultsPage((p) => Math.min(resultsPagination.totalPages, p + 1))
                      }
                      disabled={
                        resultsPagination.page >= resultsPagination.totalPages || resFetching
                      }
                      className="h-9 px-3 gap-1 text-xs font-heading uppercase tracking-wider"
                      aria-label="Pagina successiva dei risultati"
                    >
                      <span className="hidden sm:inline">Successiva</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </nav>
                )}
              </>
            );
          })()}
        </DataSection>
      </TabsContent>

      <TabsContent value="tornei">
        <DataSection
          isLoading={schLoading}
          error={schError}
          isEmpty={!schedule?.length}
          source={SCHEDULE_SOURCE}
          loadingMessage="Caricamento programma..."
          errorMessage={`Calendario tornei ${season} non disponibile`}
          errorDetail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta il programma ufficiale dei tornei di Jannik Sinner sul sito ATP Tour."
          errorCtaHint="Tocca qui per il programma tornei ufficiale"
          onRetry={() => schRefetch()}
          emptyTitle={`Calendario tornei ${season}`}
          emptyDescription="Il calendario dei tornei di Jannik Sinner per questa stagione non è ancora disponibile dalla nostra fonte. Apri il sito ufficiale ATP qui sotto per consultare il programma completo del circuito, le sedi di gioco e gli appuntamenti aggiornati."
          emptyCtaHint="Tocca qui per il programma completo"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(schedule ?? []).map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "group relative rounded-2xl border bg-card p-4",
                  "transition-[box-shadow,border-color,transform] duration-300 ease-out",
                  "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
                  "hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
                  "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
                )}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]"
                />
                <div className="relative z-1 flex items-start justify-between gap-2 mb-1">
                  <p className="font-heading font-semibold text-sm leading-tight">{t.name}</p>
                  {t.tier && (
                    <span className="shrink-0 text-[10px] font-heading uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {t.tier}
                    </span>
                  )}
                </div>
                {t.location && (
                  <p className="relative z-1 text-xs text-muted-foreground">{t.location}</p>
                )}
                <div className="relative z-1 mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t.date ? formatDateIT(t.date) : "—"}
                    {t.dateEnd ? ` → ${formatDateIT(t.dateEnd)}` : ""}
                  </span>
                  {t.surface && <span className="text-muted-foreground">{t.surface}</span>}
                </div>
                {t.result && (
                  <p className="relative z-1 mt-2 text-xs font-heading font-bold text-primary">
                    Risultato: {t.result}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </DataSection>
      </TabsContent>
    </SportTabs>
  );
}
