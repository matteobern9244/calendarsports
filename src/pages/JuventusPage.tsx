import { cn } from "@/lib/utils";
import SectionHeader from "@/components/common/SectionHeader";
import EventCountdown from "@/components/common/EventCountdown";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import OfflineFallback from "@/components/common/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCurrentJuventusSeason } from "@/lib/currentSeason";
import { useSerieAStandings, useJuventusCalendar } from "@/hooks/useSportsData";
import { formatDateIT } from "@/lib/dateUtils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useEffect, useMemo, useState } from "react";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";

const PAGE_SIZE = 12;

type PaginatedCalendar = {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextUpcomingIndex: number;
};

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

const COMPETITION_COLORS: Record<string, string> = {
  'Serie A': 'bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] border-[hsl(var(--gold))]/40',
  'Champions League': 'bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] dark:text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))]/40',
  'Coppa Italia': 'bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))] dark:text-[hsl(var(--gold))] border-[hsl(var(--secondary))]/40',
};

export default function JuventusPage() {
  const season = getCurrentJuventusSeason();
  const { data: standings, isLoading: stLoading, error: stError, refetch: stRefetch } = useSerieAStandings(season);
  const [page, setPage] = useState(1);
  const [userInteracted, setUserInteracted] = useState(false);
  const { data: calendarData, isLoading: calLoading, error: calError, refetch: calRefetch } = useJuventusCalendar(
    season,
    page,
    PAGE_SIZE,
  );
  const { isOnline } = useOnlineStatus();

  const calendar = calendarData as PaginatedCalendar | undefined;

  // Smart landing: jump to the page containing the next upcoming match on first load
  useEffect(() => {
    if (userInteracted) return;
    if (!calendar || typeof calendar.nextUpcomingIndex !== "number") return;
    if (calendar.nextUpcomingIndex < 0) return;
    const targetPage = Math.floor(calendar.nextUpcomingIndex / PAGE_SIZE) + 1;
    if (targetPage !== calendar.page) {
      setPage(targetPage);
    }
    setUserInteracted(true);
  }, [calendar, userInteracted]);

  const goToPage = (p: number) => {
    setUserInteracted(true);
    setPage(p);
  };

  if (!isOnline && stError && !standings && calError && !calendarData) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback onRetry={() => { stRefetch(); calRefetch(); }} />
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12">
      <div className="mb-2">
        <SectionHeader title="Juventus" />
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
          {calLoading && !calendar && <LoadingState message="Caricamento calendario da Sky Sport..." />}
          {calError && <ErrorState message="Errore nel caricamento del calendario" onRetry={() => calRefetch()} />}
          {!calLoading && !calError && calendar && calendar.total === 0 && <EmptyState message="Calendario partite non disponibile" />}
          {calendar && calendar.items.length > 0 && (() => {
            const items = calendar.items;
            const pageStart = (calendar.page - 1) * calendar.pageSize;
            // The "Prossima" highlight is on the global next upcoming match — show it
            // only when the current page actually contains it.
            const highlightIndex =
              calendar.nextUpcomingIndex >= pageStart && calendar.nextUpcomingIndex < pageStart + items.length
                ? calendar.nextUpcomingIndex - pageStart
                : -1;
            const orderedCalendar = items;
            const rangeStart = pageStart + 1;
            const rangeEnd = pageStart + items.length;
            const pageList = buildPageList(calendar.page, calendar.totalPages);
            return (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-heading uppercase tracking-wider">
                <span>Partite {rangeStart}–{rangeEnd} di {calendar.total}</span>
                <span className="hidden sm:inline">Pagina {calendar.page} / {calendar.totalPages}</span>
              </div>
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
                              {m.broadcaster.split(' | ').map((b: string) => {
                                const { className } = getBroadcasterStyle(b);
                                return (
                                  <span
                                    key={b}
                                    className={cn(
                                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                                      className
                                    )}
                                  >
                                    {b.trim()}
                                  </span>
                                );
                              })}
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
              {calendar.totalPages > 1 && (
                <Pagination>
                  <PaginationContent className="flex-wrap justify-center gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={calendar.page <= 1}
                        className={cn(calendar.page <= 1 && "pointer-events-none opacity-50")}
                        onClick={(e) => {
                          e.preventDefault();
                          if (calendar.page > 1) goToPage(calendar.page - 1);
                        }}
                      />
                    </PaginationItem>
                    {pageList.map((p, idx) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === calendar.page}
                            onClick={(e) => {
                              e.preventDefault();
                              goToPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={calendar.page >= calendar.totalPages}
                        className={cn(calendar.page >= calendar.totalPages && "pointer-events-none opacity-50")}
                        onClick={(e) => {
                          e.preventDefault();
                          if (calendar.page < calendar.totalPages) goToPage(calendar.page + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
