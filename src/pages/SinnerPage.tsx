import SectionHeader from "@/components/common/SectionHeader";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
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
          {resLoading && <LoadingState message="Caricamento risultati..." />}
          {resError && <ErrorState message="Errore nel caricamento dei risultati" onRetry={() => resRefetch()} />}
          {!resLoading && !resError && (!results || results.length === 0) && (
            <EmptyState message={`Nessun risultato disponibile per la stagione ${season}.`} />
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
          {schLoading && <LoadingState message="Caricamento programma..." />}
          {schError && <ErrorState message="Errore nel caricamento del programma" onRetry={() => schRefetch()} />}
          {!schLoading && !schError && (!schedule || schedule.length === 0) && (
            <EmptyState message={`Nessun torneo disponibile per la stagione ${season}`} />
          )}
          {schedule && schedule.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-heading font-semibold text-sm leading-tight">{t.name}</p>
                    {t.tier && (
                      <span className="shrink-0 text-[10px] font-heading uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {t.tier}
                      </span>
                    )}
                  </div>
                  {t.location && <p className="text-xs text-muted-foreground">{t.location}</p>}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {t.date ? formatDateIT(t.date) : "—"}
                      {t.dateEnd ? ` → ${formatDateIT(t.dateEnd)}` : ""}
                    </span>
                    {t.surface && <span className="text-muted-foreground">{t.surface}</span>}
                  </div>
                  {t.result && (
                    <p className="mt-2 text-xs font-heading font-bold text-primary">Risultato: {t.result}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
