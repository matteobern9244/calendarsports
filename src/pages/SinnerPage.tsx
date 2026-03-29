import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useSinnerInfo, useSinnerLastEvents, useSinnerNextEvents } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SinnerPage() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: playerInfo } = useSinnerInfo();
  const { data: lastEvents, isLoading: lastLoading, error: lastError, refetch: lastRefetch } = useSinnerLastEvents(seasons.sinner);
  const { data: nextEvents, isLoading: nextLoading, error: nextError, refetch: nextRefetch } = useSinnerNextEvents();

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Jannik Sinner" subtitle="Tutti i match della stagione — Dati da TheSportsDB" />

      {/* Player info card */}
      {playerInfo && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {playerInfo.thumb && (
            <img src={playerInfo.thumb} alt={playerInfo.name} className="h-16 w-16 rounded-full object-cover" />
          )}
          <div>
            <h2 className="font-heading text-xl font-bold">{playerInfo.name}</h2>
            <p className="text-sm text-muted-foreground">
              {playerInfo.nationality} · {playerInfo.sport}
              {playerInfo.height && ` · ${playerInfo.height}`}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.sinner} onSelect={(y) => setSeason("sinner", y)} minYear={2020} />
      </div>

      <Tabs defaultValue="prossimi" className="w-full">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="prossimi" className="font-heading text-xs tracking-wider uppercase">Prossimi</TabsTrigger>
          <TabsTrigger value="risultati" className="font-heading text-xs tracking-wider uppercase">Risultati</TabsTrigger>
        </TabsList>

        <TabsContent value="prossimi">
          {nextLoading && <LoadingState message="Caricamento prossimi match..." />}
          {nextError && <ErrorState message="Errore nel caricamento dei prossimi match" onRetry={() => nextRefetch()} />}
          {!nextLoading && !nextError && (!nextEvents || nextEvents.length === 0) && (
            <EmptyState message="Nessun match programmato al momento. I dati dipendono dalla disponibilità della fonte." />
          )}
          {nextEvents && nextEvents.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {nextEvents.map((e: any, i: number) => (
                <EventCard
                  key={e.id || i}
                  sport={e.league || "Tennis"}
                  title={e.name}
                  subtitle={e.round ? `Round ${e.round}` : undefined}
                  date={formatDateIT(e.date)}
                  time={e.time ? formatTimeIT(e.time, e.date) : undefined}
                  status="prossimo"
                />
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="risultati">
          {lastLoading && <LoadingState message="Caricamento risultati..." />}
          {lastError && <ErrorState message="Errore nel caricamento dei risultati" onRetry={() => lastRefetch()} />}
          {!lastLoading && !lastError && (!lastEvents || lastEvents.length === 0) && (
            <EmptyState message={`Nessun risultato disponibile per la stagione ${seasons.sinner}`} />
          )}
          {lastEvents && lastEvents.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {lastEvents.map((e: any, i: number) => (
                <EventCard
                  key={e.id || i}
                  sport={e.league || "Tennis"}
                  title={e.name || `${e.homeTeam} vs ${e.awayTeam}`}
                  subtitle={e.round ? `Round ${e.round}` : undefined}
                  date={formatDateIT(e.date)}
                  time={e.time ? formatTimeIT(e.time, e.date) : undefined}
                  status="completato"
                >
                  {(e.homeScore !== null && e.homeScore !== undefined) && (
                    <p className="text-sm font-heading font-bold text-primary">
                      {e.homeScore} – {e.awayScore}
                    </p>
                  )}
                  {e.result && (
                    <p className="text-sm text-muted-foreground">{e.result}</p>
                  )}
                </EventCard>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
