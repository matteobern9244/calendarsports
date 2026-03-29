import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useJuventusLastMatches, useJuventusNextMatch, useSerieAStandings } from "@/hooks/useSportsData";
import { formatDateTimeIT, formatDateIT } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function JuventusPage() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: nextMatches, isLoading: nextLoading, error: nextError, refetch: nextRefetch } = useJuventusNextMatch();
  const { data: lastMatches, isLoading: lastLoading, error: lastError, refetch: lastRefetch } = useJuventusLastMatches();
  const { data: standings, isLoading: standingsLoading, error: standingsError, refetch: standingsRefetch } = useSerieAStandings(seasons.juventus);

  const apiMissing = nextError || lastError || standingsError;

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Juventus" subtitle="Calendario, risultati e classifiche Serie A" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.juventus} onSelect={(y) => setSeason("juventus", y)} minYear={2020} />
      </div>

      {apiMissing && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">
            ⚠️ Per i dati reali della Juventus, è necessaria una chiave API gratuita da{" "}
            <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              football-data.org
            </a>
            . Registrati gratuitamente e aggiungi la chiave come secret <code className="text-primary">FOOTBALL_DATA_API_KEY</code>.
          </p>
        </div>
      )}

      <Tabs defaultValue="prossime" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="prossime" className="font-heading text-xs tracking-wider uppercase">Prossime</TabsTrigger>
          <TabsTrigger value="risultati" className="font-heading text-xs tracking-wider uppercase">Risultati</TabsTrigger>
          <TabsTrigger value="classifica" className="font-heading text-xs tracking-wider uppercase">Classifica</TabsTrigger>
        </TabsList>

        <TabsContent value="prossime">
          {nextLoading && <LoadingState message="Caricamento prossime partite..." />}
          {nextError && <ErrorState message="Configura la chiave API per vedere le prossime partite" onRetry={() => nextRefetch()} />}
          {!nextLoading && !nextError && (!nextMatches || nextMatches.length === 0) && <EmptyState message="Nessuna partita programmata" />}
          {nextMatches && nextMatches.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {nextMatches.map((m: any) => (
                <EventCard
                  key={m.id}
                  sport={m.competition}
                  title={`${m.homeTeam} vs ${m.awayTeam}`}
                  subtitle={m.matchday ? `Giornata ${m.matchday}` : undefined}
                  date={formatDateIT(m.date)}
                  status="prossimo"
                >
                  {m.venue && <p className="text-xs text-muted-foreground">{m.venue}</p>}
                </EventCard>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="risultati">
          {lastLoading && <LoadingState message="Caricamento risultati..." />}
          {lastError && <ErrorState message="Configura la chiave API per vedere i risultati" onRetry={() => lastRefetch()} />}
          {!lastLoading && !lastError && (!lastMatches || lastMatches.length === 0) && <EmptyState message="Nessun risultato disponibile" />}
          {lastMatches && lastMatches.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {lastMatches.map((m: any) => (
                <EventCard
                  key={m.id}
                  sport={m.competition}
                  title={`${m.homeTeam} vs ${m.awayTeam}`}
                  subtitle={m.matchday ? `Giornata ${m.matchday}` : undefined}
                  date={formatDateIT(m.date)}
                  status="completato"
                >
                  <p className="text-lg font-heading font-bold text-primary">
                    {m.homeScore} – {m.awayScore}
                  </p>
                </EventCard>
              ))}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="classifica">
          {standingsLoading && <LoadingState message="Caricamento classifica..." />}
          {standingsError && <ErrorState message="Configura la chiave API per vedere la classifica" onRetry={() => standingsRefetch()} />}
          {standings && standings.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">Pos</TableHead>
                    <TableHead className="font-heading text-xs tracking-wider uppercase">Squadra</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">G</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">V</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">N</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">P</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase hidden sm:table-cell">DR</TableHead>
                    <TableHead className="text-center font-heading text-xs tracking-wider uppercase">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s: any) => {
                    const isJuve = s.team?.toLowerCase().includes("juventus");
                    return (
                      <TableRow key={s.position} className={isJuve ? "bg-primary/5" : ""}>
                        <TableCell className="font-heading font-bold">{s.position}</TableCell>
                        <TableCell className={isJuve ? "text-primary font-heading font-bold" : "font-semibold"}>
                          {s.team}
                        </TableCell>
                        <TableCell className="text-center">{s.played}</TableCell>
                        <TableCell className="text-center">{s.wins}</TableCell>
                        <TableCell className="text-center">{s.draws}</TableCell>
                        <TableCell className="text-center">{s.losses}</TableCell>
                        <TableCell className="text-center hidden sm:table-cell">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</TableCell>
                        <TableCell className="text-center font-bold">{s.points}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
