import { cn } from "@/lib/utils";
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
        <SeasonSelector currentSeason={seasons.juventus} onSelect={(y) => setSeason("juventus", y)} />
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
          {calendar && calendar.length > 0 && (() => {
            const sorted = [...calendar].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const now = Date.now();
            const nextIdx = sorted.findIndex((m: any) => m.status !== 'FullTime' && new Date(m.date).getTime() > now);
            return (
            <motion.div className="grid gap-3 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {sorted.map((m: any, i: number) => {
                const isFinished = m.status === 'FullTime';
                const isJuveHome = m.homeTeam?.toLowerCase().includes('juventus');
                const opponent = isJuveHome ? m.awayTeam : m.homeTeam;
                const opponentLogo = isJuveHome ? m.awayLogo : m.homeLogo;
                const juveGoals = isJuveHome ? m.homeScore : m.awayScore;
                const oppGoals = isJuveHome ? m.awayScore : m.homeScore;
                const result = isFinished
                  ? juveGoals > oppGoals ? 'V' : juveGoals < oppGoals ? 'S' : 'P'
                  : null;
                const resultColor = result === 'V' ? 'text-green-500' : result === 'S' ? 'text-red-500' : 'text-yellow-500';
                const dateStr = m.date ? formatDateIT(m.date) : '—';
                const timeStr = m.date ? formatTimeIT(undefined, m.date) : '';
                const isNext = i === nextIdx;

                return (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    className={cn(
                      "relative rounded-xl border bg-card p-4 flex items-center gap-3 transition-all",
                      isNext
                        ? "border-primary/60 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    {isNext && (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase tracking-widest text-primary-foreground">
                        Prossima
                      </span>
                    )}
                    <div className="flex-shrink-0 w-8">
                      <span className="text-xs text-muted-foreground font-heading">G{m.matchday}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {opponentLogo && <img src={opponentLogo} alt={opponent} className="h-6 w-6 object-contain flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {isJuveHome ? 'vs' : '@'} {opponent}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{dateStr} · {timeStr}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {isFinished ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading font-bold">{m.homeScore} - {m.awayScore}</span>
                          <span className={`text-xs font-bold ${resultColor}`}>{result}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
