import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useSerieAStandings, useJuventusCalendar } from "@/hooks/useSportsData";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function JuventusPage() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: standings, isLoading: stLoading, error: stError, refetch: stRefetch } = useSerieAStandings(seasons.juventus);
  const { data: calendar, isLoading: calLoading, error: calError, refetch: calRefetch } = useJuventusCalendar(seasons.juventus);

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Juventus" subtitle="Dati reali da Sky Sport Italia" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.juventus} onSelect={(y) => setSeason("juventus", y)} minYear={2019} />
      </div>

      <Tabs defaultValue="classifica" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="classifica" className="font-heading text-xs tracking-wider uppercase">Classifica</TabsTrigger>
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="classifica">
          {stLoading && <LoadingState message="Caricamento classifica Serie A da Sky Sport..." />}
          {stError && <ErrorState message="Errore nel caricamento della classifica da Sky Sport" onRetry={() => stRefetch()} />}
          {!stLoading && !stError && (!standings || standings.length === 0) && <EmptyState message="Classifica non disponibile" />}
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
                    const isJuve = s.team?.toLowerCase().includes('juventus');
                    return (
                      <TableRow key={s.position} className={isJuve ? "bg-primary/5" : ""}>
                        <TableCell className="font-heading font-bold">{s.position}</TableCell>
                        <TableCell className={isJuve ? "text-primary font-heading font-bold" : "font-semibold"}>
                          <div className="flex items-center gap-2">
                            {s.logoUrl && <img src={s.logoUrl} alt={s.team} className="h-5 w-5 object-contain" />}
                            {s.team}
                          </div>
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
              <div className="p-3 border-t border-border text-center">
                <p className="text-[10px] text-muted-foreground">Fonte: Sky Sport Italia</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendario">
          {calLoading && <LoadingState message="Caricamento calendario da Sky Sport..." />}
          {calError && <ErrorState message="Errore nel caricamento del calendario" onRetry={() => calRefetch()} />}
          {!calLoading && !calError && (!calendar || calendar.length === 0) && <EmptyState message="Calendario partite non disponibile" />}
          {calendar && calendar.length > 0 && (
            <motion.div className="grid gap-4 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
              {calendar.map((m: any, i: number) => (
                <EventCard
                  key={i}
                  sport={m.competition || 'Serie A'}
                  title={`${m.homeTeam} vs ${m.awayTeam}`}
                  subtitle={m.matchday ? `Giornata ${m.matchday}` : undefined}
                  date={m.date || '—'}
                  time={m.time}
                  status={m.homeScore !== null ? 'completato' : 'prossimo'}
                >
                  {m.homeScore !== null && (
                    <p className="text-lg font-heading font-bold text-primary">{m.homeScore} – {m.awayScore}</p>
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
