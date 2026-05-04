import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import LoadingState from "@/components/common/LoadingState";
import { useSyncAll } from "@/hooks/useSyncAll";
import { useCalendarEvents, type CalendarItem, type CalendarSport } from "@/hooks/useCalendarEvents";
import { toRomeDate, formatDateTimeIT } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

// Etichette IT per settimane e mesi (no date-fns/locale per zero-dipendenze)
const WEEKDAY_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;
const MONTH_LABELS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
] as const;

type RomeYMD = { y: number; m: number; d: number };

/** Estrae anno/mese/giorno della data in fuso `Europe/Rome`. */
function toRomeYMD(date: Date): RomeYMD {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(date).split("-").map(Number);
  return { y, m, d };
}

/** Chiave `YYYY-MM-DD` in fuso Rome per indicizzare gli eventi per giorno. */
function romeDayKey(iso: string): string | null {
  const d = toRomeDate(iso);
  if (!d) return null;
  const { y, m, d: day } = toRomeYMD(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** HH:MM in fuso Rome dalla data ISO. */
function romeHHMM(iso: string): string {
  const d = toRomeDate(iso);
  if (!d) return "";
  return d.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
    hour12: false,
  });
}

/** Costruisce la matrice 6x7 di giorni del mese visualizzato (lunedì=primo). */
function buildMonthGrid(year: number, monthIndex0: number): RomeYMD[][] {
  // monthIndex0: 0..11
  const firstOfMonth = new Date(Date.UTC(year, monthIndex0, 1));
  // JS Date.getUTCDay(): 0=Dom..6=Sab. Trasformiamo in 0=Lun..6=Dom.
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const startUtc = new Date(Date.UTC(year, monthIndex0, 1 - firstWeekday));
  const weeks: RomeYMD[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: RomeYMD[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(Date.UTC(
        startUtc.getUTCFullYear(),
        startUtc.getUTCMonth(),
        startUtc.getUTCDate() + w * 7 + i,
      ));
      row.push({
        y: day.getUTCFullYear(),
        m: day.getUTCMonth() + 1,
        d: day.getUTCDate(),
      });
    }
    weeks.push(row);
  }
  return weeks;
}

function ymdKey(c: RomeYMD): string {
  return `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

const SPORT_DOT: Record<CalendarItem["sport"], string> = {
  juventus: "bg-[hsl(var(--sport-juventus))]",
  f1: "bg-[hsl(var(--sport-f1))]",
  motogp: "bg-[hsl(var(--sport-motogp))]",
};

const SPORT_LABEL: Record<CalendarItem["sport"], string> = {
  juventus: "Juventus",
  f1: "F1",
  motogp: "MotoGP",
};

const SPORT_BADGE: Record<CalendarItem["sport"], string> = {
  juventus: "border-[hsl(var(--sport-juventus))]/40 text-[hsl(var(--sport-juventus))] bg-[hsl(var(--sport-juventus))]/10",
  f1: "border-[hsl(var(--sport-f1))]/40 text-[hsl(var(--sport-f1))] bg-[hsl(var(--sport-f1))]/10",
  motogp: "border-[hsl(var(--sport-motogp))]/40 text-[hsl(var(--sport-motogp))] bg-[hsl(var(--sport-motogp))]/10",
};

const SPORTS: ReadonlyArray<CalendarSport> = ["juventus", "f1", "motogp"];
const FILTERS_KEY = "calendar.filters";
const VIEW_KEY = "calendar.view";

type ViewMode = "month" | "agenda";

function loadFilters(): Record<CalendarSport, boolean> {
  const def = { juventus: true, f1: true, motogp: true };
  if (typeof window === "undefined") return def;
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<Record<CalendarSport, boolean>>;
    return { ...def, ...parsed };
  } catch {
    return def;
  }
}

function loadView(): ViewMode {
  if (typeof window === "undefined") return "month";
  const v = window.localStorage.getItem(VIEW_KEY);
  return v === "agenda" ? "agenda" : "month";
}

/** Header giorno IT lungo, capitalizzato (es. "Sabato 7 Giugno"). */
function formatDayHeaderIT(c: RomeYMD): string {
  // Costruiamo una data UTC a mezzogiorno per evitare drift cross-DST
  const d = new Date(Date.UTC(c.y, c.m - 1, c.d, 12, 0, 0));
  const s = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CalendarPage() {
  const today = useMemo(() => toRomeYMD(new Date()), []);
  const [view, setView] = useState<RomeYMD>(today);
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadView());
  const [enabled, setEnabled] = useState<Record<CalendarSport, boolean>>(() => loadFilters());

  useEffect(() => {
    try { window.localStorage.setItem(FILTERS_KEY, JSON.stringify(enabled)); } catch { /* noop */ }
  }, [enabled]);
  useEffect(() => {
    try { window.localStorage.setItem(VIEW_KEY, viewMode); } catch { /* noop */ }
  }, [viewMode]);

  const { events, isLoading, refetchAll } = useCalendarEvents();
  const { sync, syncing, syncStep, syncProgress, lastSyncAt } = useSyncAll();

  const filteredEvents = useMemo(
    () => events.filter((e) => enabled[e.sport]),
    [events, enabled],
  );

  // Indice eventi per giorno (chiave Rome YYYY-MM-DD)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const ev of filteredEvents) {
      const key = romeDayKey(ev.date);
      if (!key) continue;
      const arr = map.get(key);
      if (arr) arr.push(ev);
      else map.set(key, [ev]);
    }
    // ordina per ora dentro il giorno
    for (const arr of map.values()) {
      arr.sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [filteredEvents]);

  const grid = useMemo(() => buildMonthGrid(view.y, view.m - 1), [view]);
  const monthLabel = `${MONTH_LABELS[view.m - 1]} ${view.y}`;

  // Lista giorni del mese visualizzato che hanno almeno un evento (post-filtri)
  const agendaDays = useMemo(() => {
    return grid
      .flat()
      .filter((c) => c.m === view.m)
      .map((c) => ({ ymd: c, key: ymdKey(c), events: eventsByDay.get(ymdKey(c)) ?? [] }))
      .filter((g) => g.events.length > 0);
  }, [grid, view.m, eventsByDay]);

  const goPrev = () => {
    const m = view.m - 1;
    setView(m === 0 ? { y: view.y - 1, m: 12, d: 1 } : { y: view.y, m, d: 1 });
  };
  const goNext = () => {
    const m = view.m + 1;
    setView(m === 13 ? { y: view.y + 1, m: 1, d: 1 } : { y: view.y, m, d: 1 });
  };
  const goToday = () => setView(today);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    return new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(lastSyncAt);
  }, [lastSyncAt]);

  return (
    <div className="container py-4 sm:py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="rounded-full px-4 h-9 font-heading uppercase tracking-wider text-xs border-[hsl(var(--gold))]/40 hover:bg-[hsl(var(--gold))]/10"
          >
            Oggi
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            aria-label="Mese precedente"
            className="rounded-full h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            aria-label="Mese successivo"
            className="rounded-full h-9 w-9"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 font-heading text-2xl md:text-3xl tracking-wide">
            {monthLabel}
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center justify-end gap-3">
            {syncing && syncStep ? (
              <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground animate-pulse" aria-live="polite">
                {syncStep}
              </span>
            ) : lastSyncLabel ? (
              <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground" aria-live="polite">
                Ultimo aggiornamento: <span className="text-foreground/80 font-mono normal-case">{lastSyncLabel}</span>
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="default"
              onClick={() => {
                sync();
                refetchAll();
              }}
              disabled={syncing}
              className="btn-gold gap-2 shrink-0 px-5 h-10 rounded-full text-xs font-heading uppercase tracking-widest font-semibold hover:text-primary-foreground"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Sincronizzo..." : "Sincronizza"}
            </Button>
          </div>
          {syncing && (
            <Progress value={syncProgress} aria-label="Avanzamento sincronizzazione" className="h-1.5 w-[240px]" />
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {SPORTS.map((s) => {
          const on = enabled[s];
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              title={on ? `Nascondi ${SPORT_LABEL[s]}` : `Mostra ${SPORT_LABEL[s]}`}
              onClick={() => setEnabled((prev) => ({ ...prev, [s]: !prev[s] }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                "font-heading uppercase tracking-wider",
                on
                  ? SPORT_BADGE[s]
                  : "border-border/50 text-muted-foreground/60 bg-transparent line-through",
              )}
            >
              <span className={cn("inline-block h-2 w-2 rounded-full", SPORT_DOT[s], !on && "opacity-40")} />
              <span>{SPORT_LABEL[s]}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setEnabled({ juventus: true, f1: true, motogp: true })}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 font-heading uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-[hsl(var(--gold))]/40 transition-colors"
          title="Mostra tutti gli sport"
        >
          Tutti
        </button>

        {/* Toggle vista Mese / Agenda */}
        <div className="ml-auto inline-flex rounded-full border border-border/60 overflow-hidden" role="tablist" aria-label="Vista calendario">
          {(["month", "agenda"] as const).map((m) => {
            const active = viewMode === m;
            const label = m === "month" ? "Mese" : "Agenda";
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-3 py-1 font-heading uppercase tracking-wider text-xs transition-colors",
                  active
                    ? "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && events.length === 0 && <LoadingState message="Caricamento calendario..." />}

      {/* Vista mese (>= md) */}
      {viewMode === "month" && (
      <div className="hidden md:block rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
        {/* Header settimana */}
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {WEEKDAY_LABELS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-[11px] font-heading uppercase tracking-widest text-muted-foreground text-center"
            >
              {w}
            </div>
          ))}
        </div>
        {/* Griglia */}
        <div className="grid grid-cols-7 grid-rows-6 [grid-auto-rows:minmax(120px,1fr)]">
          {grid.flat().map((cell) => {
            const key = ymdKey(cell);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = cell.y === today.y && cell.m === today.m && cell.d === today.d;
            const inMonth = cell.m === view.m;
            const visible = dayEvents.slice(0, 4);
            const hidden = dayEvents.length - visible.length;
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[120px] border-r border-b border-border/40 p-1.5 flex flex-col gap-1",
                  !inMonth && "bg-muted/10 text-muted-foreground/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center text-xs font-medium",
                      isToday
                        ? "h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold"
                        : "px-1",
                    )}
                  >
                    {cell.d}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {visible.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="group flex items-start gap-1 text-left text-[11px] leading-tight px-1 py-0.5 rounded hover:bg-muted/50 transition-colors"
                      title={`${romeHHMM(ev.date)} ${ev.title}`}
                    >
                      <span className={cn("mt-1 h-1.5 w-1.5 rounded-full shrink-0", SPORT_DOT[ev.sport])} />
                      <span className="truncate">
                        <span className="font-mono">{romeHHMM(ev.date)}</span>{" "}
                        <span className="font-semibold uppercase tracking-wide">
                          {SPORT_LABEL[ev.sport]}:
                        </span>{" "}
                        <span>{ev.shortLabel}</span>{" "}
                        <span className="text-muted-foreground">({ev.context})</span>
                      </span>
                    </button>
                  ))}
                  {hidden > 0 && (
                    <button
                      onClick={() => setSelectedEvent(dayEvents[4])}
                      className="text-[11px] text-muted-foreground hover:text-foreground px-1"
                    >
                      +{hidden} altri
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Vista lista (mobile) — solo in modalità mese */}
      {viewMode === "month" && (
      <div className="md:hidden space-y-3">
        {grid.flat()
          .filter((c) => c.m === view.m)
          .map((cell) => {
            const key = ymdKey(cell);
            const dayEvents = eventsByDay.get(key) ?? [];
            if (dayEvents.length === 0) return null;
            const isToday = cell.y === today.y && cell.m === today.m && cell.d === today.d;
            return (
              <div key={key} className="rounded-lg border border-border/50 bg-card/60 overflow-hidden">
                <div className={cn(
                  "px-3 py-1.5 flex items-center justify-between text-xs font-heading uppercase tracking-widest border-b border-border/40",
                  isToday ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground",
                )}>
                  <span>{cell.d} {MONTH_LABELS[cell.m - 1]}</span>
                  <span>{dayEvents.length} eventi</span>
                </div>
                <ul className="divide-y divide-border/40">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/40"
                      >
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SPORT_DOT[ev.sport])} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">
                            {ev.shortLabel} <span className="text-muted-foreground font-normal">· {ev.context}</span>
                          </span>
                          <span className="block text-xs text-muted-foreground font-mono mt-0.5">
                            {romeHHMM(ev.date)} · {SPORT_LABEL[ev.sport]}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        {!isLoading && grid.flat().filter((c) => c.m === view.m).every((c) => (eventsByDay.get(ymdKey(c)) ?? []).length === 0) && (
          <p className="text-center text-muted-foreground py-12">Nessun evento in {monthLabel}</p>
        )}
      </div>
      )}

      {/* Vista Agenda */}
      {viewMode === "agenda" && (
        <div className="space-y-3">
          {agendaDays.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-12">Nessun evento in {monthLabel}</p>
          )}
          {agendaDays.map(({ ymd, key, events: dayEvents }) => {
            const isToday = ymd.y === today.y && ymd.m === today.m && ymd.d === today.d;
            return (
              <section key={key} className="rounded-lg border border-border/50 bg-card/60 overflow-hidden">
                <header className={cn(
                  "sticky top-0 z-10 px-3 py-2 flex items-center justify-between text-xs font-heading uppercase tracking-widest border-b border-border/40 backdrop-blur",
                  isToday
                    ? "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]"
                    : "bg-muted/40 text-muted-foreground",
                )}>
                  <span>{formatDayHeaderIT(ymd)}</span>
                  <span>{dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventi"}</span>
                </header>
                <ul className="divide-y divide-border/40">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                      >
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SPORT_DOT[ev.sport])} />
                        <span className="font-mono text-xs text-muted-foreground w-12 shrink-0 mt-0.5">
                          {romeHHMM(ev.date)}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] font-heading uppercase tracking-widest shrink-0 mt-0.5", SPORT_BADGE[ev.sport])}>
                          {SPORT_LABEL[ev.sport]}
                        </Badge>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">
                            {ev.shortLabel}
                            <span className="text-muted-foreground font-normal"> · {ev.context}</span>
                          </span>
                          {ev.broadcaster && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              In TV: <span className="text-foreground/80">{ev.broadcaster}</span>
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Dialog dettaglio evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={cn("text-[10px] font-heading uppercase tracking-widest", SPORT_BADGE[selectedEvent.sport])}>
                    {SPORT_LABEL[selectedEvent.sport]}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDateTimeIT(selectedEvent.date)}
                  </span>
                </div>
                <DialogTitle className="text-left">
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {selectedEvent.context}
                </DialogDescription>
              </DialogHeader>
              {selectedEvent.broadcaster && (
                <div className="text-sm">
                  <span className="text-muted-foreground">In TV: </span>
                  <span className="font-semibold">{selectedEvent.broadcaster}</span>
                </div>
              )}
              <DialogFooter>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={selectedEvent.href} onClick={() => setSelectedEvent(null)}>
                    Vai a {SPORT_LABEL[selectedEvent.sport]}
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}