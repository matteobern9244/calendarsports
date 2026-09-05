import { useEffect, useMemo, useState } from "react";
import {
  MONTH_LABELS,
  buildMonthGrid,
  romeDayKey,
  romeHHMMFromDate,
  toRomeYMD,
  ymdKey,
  type RomeYMD,
} from "@/lib/calendarGrid";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
import AgendaView from "@/components/calendar/AgendaView";
import DayEventsDialog from "@/components/calendar/DayEventsDialog";
import MonthGrid from "@/components/calendar/MonthGrid";
import MonthList from "@/components/calendar/MonthList";
import { SPORT_BADGE, SPORT_DOT, SPORT_LABEL } from "@/components/calendar/sportStyles";
import LoadingState from "@/components/common/LoadingState";
import { useNowMinute } from "@/hooks/useNow";
import { useSyncAll } from "@/hooks/useSyncAll";
import {
  useCalendarEvents,
  type CalendarItem,
  type CalendarSport,
} from "@/hooks/useCalendarEvents";
import { toRomeDate, formatDateTimeIT } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

// Etichette IT per settimane e mesi (no date-fns/locale per zero-dipendenze)
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
export default function CalendarPage() {
  const today = useMemo(() => toRomeYMD(new Date()), []);
  const [view, setView] = useState<RomeYMD>(today);
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  // Il giorno di cui e' aperto l'elenco completo, non i suoi eventi: cosi'
  // l'elenco resta agganciato ai filtri anche a dialogo aperto.
  const [openDay, setOpenDay] = useState<RomeYMD | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadView());
  const [enabled, setEnabled] = useState<Record<CalendarSport, boolean>>(() => loadFilters());

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTERS_KEY, JSON.stringify(enabled));
    } catch {
      /* noop */
    }
  }, [enabled]);
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, viewMode);
    } catch {
      /* noop */
    }
  }, [viewMode]);

  const { events, isLoading, refetchAll } = useCalendarEvents();
  const { sync, syncing, syncStep, syncProgress, lastSyncAt } = useSyncAll();

  // "Passato" = orario di inizio < ora corrente, ricalcolato ogni minuto
  // per ingrigire gli eventi appena conclusi. L'ora arriva dal clock
  // condiviso dell'app invece che da un `setInterval` di pagina: quello
  // continuava a girare anche a scheda nascosta, mentre il clock si ferma
  // in background e riparte allineato.
  const nowMs = useNowMinute();
  const isPast = (iso: string): boolean => {
    const d = toRomeDate(iso);
    return d ? d.getTime() < nowMs : false;
  };

  const filteredEvents = useMemo(() => events.filter((e) => enabled[e.sport]), [events, enabled]);

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

  // Con il formatter a modulo la formattazione costa quanto leggere una
  // variabile: la `useMemo` che la avvolgeva non serve piu'.
  const lastSyncLabel = lastSyncAt ? romeHHMMFromDate(lastSyncAt) : null;

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
          <h1 className="ml-2 font-heading text-2xl md:text-3xl tracking-wide">{monthLabel}</h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center justify-end gap-3">
            {syncing && syncStep ? (
              <span
                className="text-xs font-heading uppercase tracking-wider text-muted-foreground animate-pulse"
                aria-live="polite"
              >
                {syncStep}
              </span>
            ) : lastSyncLabel ? (
              <span
                className="text-xs font-heading uppercase tracking-wider text-muted-foreground"
                aria-live="polite"
              >
                Ultimo aggiornamento:{" "}
                <span className="text-foreground/80 font-mono normal-case">{lastSyncLabel}</span>
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
            <Progress
              value={syncProgress}
              aria-label="Avanzamento sincronizzazione"
              className="h-1.5 w-[240px]"
            />
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
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  SPORT_DOT[s],
                  !on && "opacity-40",
                )}
              />
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
        <div
          className="ml-auto inline-flex rounded-full border border-border/60 overflow-hidden"
          role="tablist"
          aria-label="Vista calendario"
        >
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

      {viewMode === "month" && (
        <MonthGrid
          grid={grid}
          view={view}
          today={today}
          eventsByDay={eventsByDay}
          isPast={isPast}
          onSelect={setSelectedEvent}
          onOpenDay={setOpenDay}
        />
      )}

      {viewMode === "month" && (
        <MonthList
          grid={grid}
          view={view}
          today={today}
          eventsByDay={eventsByDay}
          isPast={isPast}
          onSelect={setSelectedEvent}
          isLoading={isLoading}
          monthLabel={monthLabel}
        />
      )}

      {viewMode === "agenda" && (
        <AgendaView
          agendaDays={agendaDays}
          today={today}
          isPast={isPast}
          onSelect={setSelectedEvent}
          isLoading={isLoading}
          monthLabel={monthLabel}
        />
      )}

      {/* Elenco completo di un giorno, dietro «+N altri» della griglia */}
      <DayEventsDialog
        day={openDay}
        events={openDay ? (eventsByDay.get(ymdKey(openDay)) ?? []) : []}
        isPast={isPast}
        onSelect={(ev) => {
          setOpenDay(null);
          setSelectedEvent(ev);
        }}
        onClose={() => setOpenDay(null)}
      />

      {/* Dialog dettaglio evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-heading uppercase tracking-widest",
                      SPORT_BADGE[selectedEvent.sport],
                    )}
                  >
                    {SPORT_LABEL[selectedEvent.sport]}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDateTimeIT(selectedEvent.date)}
                  </span>
                </div>
                <DialogTitle className="text-left">{selectedEvent.title}</DialogTitle>
                <DialogDescription className="text-left">{selectedEvent.context}</DialogDescription>
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
