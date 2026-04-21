import { cn } from "@/lib/utils";
import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import EventCard from "@/components/common/EventCard";
import EventCountdown from "@/components/common/EventCountdown";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { useSeasonPreferences } from "@/hooks/useSeasonPreferences";
import { useSerieAStandings, useJuventusCalendar } from "@/hooks/useSportsData";
import { formatDateIT, prioritizeNextUpcoming } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const COMPETITION_COLORS: Record<string, string> = {
  'Serie A': 'bg-emerald-600/20 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400 border-emerald-600/30',
  'Champions League': 'bg-blue-600/20 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400 border-blue-600/30',
  'Coppa Italia': 'bg-amber-600/20 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400 border-amber-600/30',
};

export default function JuventusPage() {
  const { seasons, setSeason } = useSeasonPreferences();
  const { data: standings, isLoading: stLoading, error: stError, refetch: stRefetch } = useSerieAStandings(seasons.juventus);
  const { data: calendar, isLoading: calLoading, error: calError, refetch: calRefetch } = useJuventusCalendar(seasons.juventus);

  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader title="Juventus" />

      <div className="mb-6">
        <SeasonSelector currentSeason={seasons.juventus} onSelect={(y) => setSeason("juventus", y)} />
      </div>

      <Tabs defaultValue="calendario" className="w-full">
        <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calendario" className="font-heading text-xs tracking-wider uppercase">Calendario</TabsTrigger>
          <TabsTrigger value="classifica" className="font-heading text-xs tracking-wider uppercase">Classifica</TabsTrigger>
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
            const { items: orderedCalendar, highlightIndex } = prioritizeNextUpcoming(
              calendar,
              (match: any) => match.date,
              (match: any) => match.status !== 'FullTime'
            );
            return (
            <motion.div className="grid gap-3 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
              {orderedCalendar.map((m: any, i: number) => {
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
                const timeStr = m.date ? new Date(m.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : '';
                const isNext = i === highlightIndex;
                const compColor = COMPETITION_COLORS[m.competition] || '';

                return (
                  <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -3 }}
                    className={cn(
                      "group relative rounded-2xl border bg-card px-4 py-3.5 flex items-center gap-3",
                      "transition-[box-shadow,border-color,transform] duration-300 ease-out",
                      "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
                      "hover:shadow-[0_16px_36px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
                      isNext
                        ? "border-[hsl(var(--gold))]/60 ring-1 ring-[hsl(var(--gold))]/25 hover:border-[hsl(var(--gold))]/80"
                        : "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]"
                    />
                    {isNext && (
                      <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-gradient-to-r from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase tracking-widest text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.6)]">
                        Prossima
                      </span>
                    )}
                    <div className="relative z-[1] flex-shrink-0 w-8">
                      <span className="text-xs text-muted-foreground font-heading">
                        {m.competition === 'Serie A' ? `G${m.matchday}` : m.matchday ? `R${m.matchday}` : '—'}
                      </span>
                    </div>
                    <div className="relative z-[1] flex items-center gap-2 flex-1 min-w-0">
                      {opponentLogo && <img src={opponentLogo} alt={opponent} className="h-6 w-6 object-contain flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {isJuveHome ? 'vs' : '@'} {opponent}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-4 border", compColor)}>
                            {m.competition}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{dateStr} · {timeStr}</span>
                          {m.broadcaster && (
                            <span className="inline-flex items-center gap-1 flex-wrap">
                              {m.broadcaster.split(' | ').map((b: string) => (
                                <span
                                  key={b}
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                                    b.trim() === 'DAZN'
                                      ? "bg-[#1a1a2e] text-[#f5f5f5] dark:bg-[#f5f5f5] dark:text-[#1a1a2e]"
                                      : "bg-sky-600/20 text-sky-600 dark:bg-sky-400/20 dark:text-sky-400"
                                  )}
                                >
                                  {b.trim()}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative z-[1] flex-shrink-0 text-right flex flex-col items-end gap-1">
                      {isFinished ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-heading font-bold">{m.homeScore} - {m.awayScore}</span>
                          <span className={`text-xs font-bold ${resultColor}`}>{result}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {!isFinished && m.date && (
                        <EventCountdown startDate={m.date} />
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
