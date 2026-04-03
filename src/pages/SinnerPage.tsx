import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useSinnerInfo, useSinnerResults, useSinnerSchedule } from "@/hooks/useSportsData";
import { formatDateIT, getEventStatus, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SinnerPage() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: playerInfo } = useSinnerInfo();
  const { data: results, isLoading: resLoading, error: resError, refetch: resRefetch } = useSinnerResults(seasons.sinner);
  const { data: schedule, isLoading: schLoading, error: schError, refetch: schRefetch } = useSinnerSchedule(seasons.sinner);

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Jannik Sinner" subtitle="Dati da ATP Tour" />

      {/* Player info card */}
      {playerInfo && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gold-gradient text-xl font-heading font-bold text-primary-foreground">
            {playerInfo.ranking || '1'}
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">{playerInfo.name}</h2>
            <p className="text-sm text-muted-foreground">
              🇮🇹 {playerInfo.nationality} · {playerInfo.height} · {playerInfo.weight} · {playerInfo.birthPlace}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.sinner} onSelect={(y) => setSeason("sinner", y)} />
      </div>

      <Tabs defaultValue="risultati" className="w-full">
        <TabsList className="mb-6 bg-muted">
          <TabsTrigger value="risultati" className="font-heading text-xs tracking-wider uppercase">Risultati</TabsTrigger>
          <TabsTrigger value="tornei" className="font-heading text-xs tracking-wider uppercase">Tornei</TabsTrigger>
        </TabsList>

        <TabsContent value="risultati">
          {resLoading && <LoadingState message="Caricamento risultati da ATP Tour..." />}
          {resError && <ErrorState message="Errore nel caricamento dei risultati" onRetry={() => resRefetch()} />}
          {!resLoading && !resError && (!results || results.length === 0) && (
            <EmptyState message={`Nessun risultato disponibile per la stagione ${seasons.sinner}. Lo scraping ATP potrebbe essere limitato.`} />
          )}
          {results && results.length > 0 && (() => {
            const { items: orderedResults, highlightIndex } = prioritizeNextUpcoming(results, (result: any) => result.date);
            return (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {orderedResults.map((r: any, i: number) => (
                <EventCard
                  key={i}
                  sport={r.tournament || 'ATP'}
                  title={r.opponent ? `vs. ${r.opponent}` : r.tournament}
                  date={r.date ? formatDateIT(r.date) : '—'}
                  status={r.date ? getEventStatus(r.date) : 'completato'}
                  highlight={i === highlightIndex}
                >
                  {r.score && <p className="text-sm font-heading font-bold text-primary">{r.score}</p>}
                </EventCard>
              ))}
            </motion.div>
            );
          })()}
        </TabsContent>

        <TabsContent value="tornei">
          {schLoading && <LoadingState message="Caricamento programma da ATP Tour..." />}
          {schError && <ErrorState message="Errore nel caricamento del programma" onRetry={() => schRefetch()} />}
          {!schLoading && !schError && (!schedule || schedule.length === 0) && (
            <EmptyState message={`Nessun torneo disponibile per la stagione ${seasons.sinner}`} />
          )}
          {schedule && schedule.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <p className="font-semibold text-sm">{t.name}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
