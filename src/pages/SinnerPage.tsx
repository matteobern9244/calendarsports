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
import { formatDateIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function SinnerPage() {
  const season = getCurrentSinnerSeason();
  const { data: playerInfo } = useSinnerInfo();
  const { data: results, isLoading: resLoading, error: resError, refetch: resRefetch } = useSinnerResults(season);
  const { data: schedule, isLoading: schLoading, error: schError, refetch: schRefetch } = useSinnerSchedule(season);
  const { isOnline } = useOnlineStatus();

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
          {resError && <ErrorState message="Errore nel caricamento dei risultati" onRetry={() => resRefetch()} />}
          {!resLoading && !resError && (!results || results.length === 0) && (
            <UnavailableExternalSource
              title={`Risultati stagione ${season}`}
              description="I risultati dei match di Jannik Sinner per questa stagione non sono ancora stati pubblicati dalla nostra fonte. Apri il profilo ufficiale ATP qui sotto per consultare lo storico completo delle partite, i punteggi set per set e le statistiche aggiornate."
              externalLink="https://www.atptour.com/en/players/jannik-sinner/s0ag/overview"
              externalLabel="Vedi risultati su ATP Tour"
              ctaHint="Tocca qui per i punteggi set per set"
            />
          )}
          {results && results.length > 0 && (() => {
            const { items: orderedResults, highlightIndex } = prioritizeNextUpcoming(results, (result: any) => result.date);
            return (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
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
          {schError && <ErrorState message="Errore nel caricamento del programma" onRetry={() => schRefetch()} />}
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
