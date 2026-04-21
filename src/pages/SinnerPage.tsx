import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import SectionHeader from "@/components/common/SectionHeader";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import UnavailableExternalSource from "@/components/common/UnavailableExternalSource";
import OfflineFallback from "@/components/common/OfflineFallback";
import PlayerHeader from "@/components/sinner/PlayerHeader";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCurrentSinnerSeason } from "@/lib/currentSeason";
import { useSinnerInfo, useSinnerResults, useSinnerSchedule } from "@/hooks/useSportsData";
import { tennisApi } from "@/lib/api/sportsApi";
import { formatDateIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Numero di risultati per pagina lato UI. Volutamente piccolo (4) per
// mostrare in vista solo le ultime quattro schede di match e demandare
// tutto il resto alla paginazione, riducendo la verticalita' della
// pagina e velocizzando la scansione visiva. Il backend (`supabase/
// functions/sports-tennis`, action `results`) accetta `pageSize`
// arbitrario, quindi non serve allineamento server-side.
const RESULTS_PAGE_SIZE = 4;

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
  } = useSinnerResults(
    season,
    resultsPage,
    RESULTS_PAGE_SIZE,
  );
  const { data: schedule, isLoading: schLoading, error: schError, refetch: schRefetch } = useSinnerSchedule(season);
  const { isOnline } = useOnlineStatus();

  // Reset paginazione quando cambia la stagione: pagine alte di una
  // stagione precedente non hanno senso per la nuova.
  useEffect(() => {
    setResultsPage(1);
  }, [season]);

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

  // Compatibilita' di forma: il backend ora restituisce
  // `{ items, pagination }`, ma per sicurezza accettiamo anche il
  // vecchio shape `MatchRow[]` (es. cache stale o fallback).
  const resultItems: any[] = Array.isArray(results)
    ? results
    : (results?.items ?? []);
  const resultsPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null = !Array.isArray(results) && results?.pagination ? results.pagination : null;

  if (!isOnline && resError && !results && schError && !schedule && !playerInfo) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback onRetry={() => { resRefetch(); schRefetch(); }} />
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-2">
        <SectionHeader title="Jannik Sinner" />
      </div>

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

      <Tabs defaultValue="risultati" className="w-full">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="risultati" className="font-heading text-xs tracking-wider uppercase">Risultati</TabsTrigger>
          <TabsTrigger value="tornei" className="font-heading text-xs tracking-wider uppercase">Tornei</TabsTrigger>
        </TabsList>

        <TabsContent value="risultati">
          {resLoading && (
            <LoadingState
              message="Caricamento risultati..."
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/overview"
              externalLabel="Scopri ora su ATP Tour"
            />
          )}
          {resError && (
            <ErrorState
              message={`Risultati stagione ${season} non disponibili`}
              detail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta lo storico ufficiale dei match di Jannik Sinner sul sito ATP Tour."
              onRetry={() => resRefetch()}
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/overview"
              externalLabel="Vedi risultati su ATP Tour"
              ctaHint="Tocca qui per i punteggi set per set ufficiali"
            />
          )}
          {!resLoading && !resError && resultItems.length === 0 && (
            <UnavailableExternalSource
              title={`Risultati stagione ${season}`}
              description="I risultati dei match di Jannik Sinner per questa stagione non sono ancora stati pubblicati dalla nostra fonte. Apri il profilo ufficiale ATP qui sotto per consultare lo storico completo delle partite, i punteggi set per set e le statistiche aggiornate."
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/overview"
              externalLabel="Vedi risultati su ATP Tour"
              ctaHint="Tocca qui per i punteggi set per set"
            />
          )}
          {resultItems.length > 0 && (() => {
            const { items: orderedResults, highlightIndex } = prioritizeNextUpcoming(
              resultItems,
              (result: any) => result.date,
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
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm"
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
              {orderedResults.map((r: any, i: number) => (
                <EventCard
                  key={i}
                  sport={r.tournament || 'ATP'}
                  title={r.opponent ? `vs. ${r.opponent}${r.opponentRank ? ` (#${r.opponentRank})` : ""}` : r.tournament}
                  subtitle={r.round ? `${r.round}${r.surface ? ` · ${r.surface}` : ""}` : r.surface}
                  date={r.date ? formatDateIT(r.date) : '—'}
                  startDate={r.date}
                  status={r.date ? getEventStatus(r.date) : 'completato'}
                  highlight={i === highlightIndex}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.result && (
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-2 text-xs font-heading font-bold",
                          r.result === "V"
                            ? "bg-success/15 text-success border border-success/30"
                            : "bg-destructive/15 text-destructive border border-destructive/30",
                        )}
                        aria-label={r.result === "V" ? "Vittoria" : "Sconfitta"}
                      >
                        {r.result}
                      </span>
                    )}
                    {r.score && <p className="text-sm font-heading font-bold text-foreground">{r.score}</p>}
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
                  Pagina {resultsPagination.page} / {resultsPagination.totalPages} · {resultsPagination.total} risultati
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResultsPage((p) => Math.min(resultsPagination.totalPages, p + 1))}
                  disabled={resultsPagination.page >= resultsPagination.totalPages || resFetching}
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
        </TabsContent>

        <TabsContent value="tornei">
          {schLoading && (
            <LoadingState
              message="Caricamento programma..."
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity"
              externalLabel="Scopri ora su ATP Tour"
            />
          )}
          {schError && (
            <ErrorState
              message={`Calendario tornei ${season} non disponibile`}
              detail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta il programma ufficiale dei tornei di Jannik Sinner sul sito ATP Tour."
              onRetry={() => schRefetch()}
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity"
              externalLabel="Vedi calendario su ATP Tour"
              ctaHint="Tocca qui per il programma tornei ufficiale"
            />
          )}
          {!schLoading && !schError && (!schedule || schedule.length === 0) && (
            <UnavailableExternalSource
              title={`Calendario tornei ${season}`}
              description="Il calendario dei tornei di Jannik Sinner per questa stagione non è ancora disponibile dalla nostra fonte. Apri il sito ufficiale ATP qui sotto per consultare il programma completo del circuito, le sedi di gioco e gli appuntamenti aggiornati."
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/player-activity"
              externalLabel="Vedi calendario su ATP Tour"
              ctaHint="Tocca qui per il programma completo"
            />
          )}
          {schedule && schedule.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.map((t: any, i: number) => (
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
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]"
                  />
                  <div className="relative z-[1] flex items-start justify-between gap-2 mb-1">
                    <p className="font-heading font-semibold text-sm leading-tight">{t.name}</p>
                    {t.tier && (
                      <span className="shrink-0 text-[10px] font-heading uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {t.tier}
                      </span>
                    )}
                  </div>
                  {t.location && <p className="relative z-[1] text-xs text-muted-foreground">{t.location}</p>}
                  <div className="relative z-[1] mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t.date ? formatDateIT(t.date) : "—"}
                      {t.dateEnd ? ` → ${formatDateIT(t.dateEnd)}` : ""}
                    </span>
                    {t.surface && <span className="text-muted-foreground">{t.surface}</span>}
                  </div>
                  {t.result && (
                    <p className="relative z-[1] mt-2 text-xs font-heading font-bold text-primary">Risultato: {t.result}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
