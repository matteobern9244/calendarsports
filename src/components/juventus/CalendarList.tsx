import { motion } from "framer-motion";
import { Link } from "react-router";
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
import EventCountdown from "@/components/common/EventCountdown";
import TeamLogo from "@/components/common/TeamLogo";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";
import { formatJuventusDateTime } from "@/lib/dateUtils";
import { highlightIndexOnPage, pageRange, type PaginatedCalendar } from "@/lib/juventusCalendar";
import { matchResult, matchSide } from "@/lib/juventusMatch";
import { buildPageList } from "@/lib/pageList";
import { cn } from "@/lib/utils";
import { COMPETITION_COLORS } from "./competitionColors";

interface CalendarListProps {
  calendar: PaginatedCalendar;
  upcomingOnly: boolean;
  onChangeFilter: (onlyUpcoming: boolean) => void;
  onGoToPage: (page: number) => void;
}

/**
 * Una pagina del calendario Juventus: intestazione con filtro e conteggio,
 * le partite come link al dettaglio, la barra di paginazione.
 */
export default function CalendarList({
  calendar,
  upcomingOnly,
  onChangeFilter,
  onGoToPage,
}: CalendarListProps) {
  const items = calendar.items;
  // The "Prossima" highlight is on the global next upcoming match — show it
  // only when the current page actually contains it.
  const highlightIndex = highlightIndexOnPage(calendar);
  const { start: rangeStart, end: rangeEnd } = pageRange(calendar);
  const pageList = buildPageList(calendar.page, calendar.totalPages);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-heading uppercase tracking-wider">
        <span>
          Partite {rangeStart}–{rangeEnd} di {calendar.total}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
            <button
              type="button"
              onClick={() => onChangeFilter(true)}
              aria-pressed={upcomingOnly}
              className={`rounded-full px-2.5 py-1 transition-colors ${upcomingOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Prossime
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter(false)}
              aria-pressed={!upcomingOnly}
              className={`rounded-full px-2.5 py-1 transition-colors ${!upcomingOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Tutte
            </button>
          </div>
          <span className="hidden sm:inline">
            Pagina {calendar.page} / {calendar.totalPages}
          </span>
        </div>
      </div>
      <motion.div
        className="grid gap-3 sm:grid-cols-2"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      >
        {items.map((m, i) => {
          const isFinished = m.status === "FullTime";
          const { isJuveHome, opponent, opponentLogo } = matchSide(m);
          const result = matchResult(m);
          const resultColor =
            result === "V" ? "text-green-500" : result === "S" ? "text-red-500" : "text-yellow-500";
          const { date: dateStr, time: timeStr } = formatJuventusDateTime(m.date);
          const isNext = i === highlightIndex;
          const compColor = COMPETITION_COLORS[m.competition] || "";

          return (
            <motion.div
              key={m.id ?? `${m.competition}-${m.date}-${m.homeTeam}-${m.awayTeam}`}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -3 }}
              className={cn(
                "group relative rounded-2xl border bg-card",
                "transition-[box-shadow,border-color,transform] duration-300 ease-out",
                "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
                "hover:shadow-[0_16px_36px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
                isNext
                  ? "border-[hsl(var(--gold))]/60 ring-1 ring-[hsl(var(--gold))]/25 hover:border-[hsl(var(--gold))]/80"
                  : "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
              )}
            >
              <Link
                to={`/juventus/partite/${encodeURIComponent(m.id ?? "")}`}
                aria-label={`Apri dettaglio ${m.homeTeam} vs ${m.awayTeam}`}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]"
                />
                {isNext && (
                  <span className="absolute -top-2.5 left-4 z-10 rounded-full bg-linear-to-r from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase tracking-widest text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.6)]">
                    Prossima
                  </span>
                )}
                <div className="relative z-1 shrink-0 w-8">
                  <span className="text-xs text-muted-foreground font-heading">
                    {m.competition === "Serie A"
                      ? `G${m.matchday}`
                      : m.matchday
                        ? `R${m.matchday}`
                        : "—"}
                  </span>
                </div>
                <div className="relative z-1 flex items-center gap-2 flex-1 min-w-0">
                  <TeamLogo src={opponentLogo} name={opponent} size={24} shape="circle" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {isJuveHome ? "vs" : "@"} {opponent}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-4 border",
                          compColor,
                        )}
                      >
                        {m.competition}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {dateStr} · {timeStr}
                      </span>
                      {m.broadcaster && (
                        <span className="inline-flex items-center gap-1 flex-wrap">
                          {m.broadcaster.split(" | ").map((b: string) => {
                            const { className } = getBroadcasterStyle(b);
                            return (
                              <span
                                key={b}
                                className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                                  className,
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
                <div className="relative z-1 shrink-0 text-right flex flex-col items-end gap-1">
                  {isFinished ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-heading font-bold">
                        {m.homeScore} - {m.awayScore}
                      </span>
                      <span className={`text-xs font-bold ${resultColor}`}>{result}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {!isFinished && m.date && <EventCountdown startDate={m.date} />}
                </div>
              </Link>
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
                  if (calendar.page > 1) onGoToPage(calendar.page - 1);
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
                      onGoToPage(p);
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
                className={cn(
                  calendar.page >= calendar.totalPages && "pointer-events-none opacity-50",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  if (calendar.page < calendar.totalPages) onGoToPage(calendar.page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
