import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { MONTH_LABELS, romeHHMM, ymdKey, type RomeYMD } from "@/lib/calendarGrid";
import { cn } from "@/lib/utils";
import { SPORT_DOT, SPORT_LABEL } from "./sportStyles";

interface MonthListProps {
  /** Le sei settimane del mese: qui si tengono solo i giorni del mese. */
  grid: RomeYMD[][];
  /** Il mese mostrato. */
  view: RomeYMD;
  /** Il giorno di oggi in fuso italiano, per evidenziare la cella. */
  today: RomeYMD;
  /** Eventi del giorno, indicizzati per chiave `YYYY-MM-DD` romana. */
  eventsByDay: Map<string, CalendarItem[]>;
  /** Un evento gia' cominciato si mostra ingrigito e barrato. */
  isPast: (iso: string) => boolean;
  /** Apre il dettaglio dell'evento. */
  onSelect: (event: CalendarItem) => void;
  /** Finche' e' vero non si dice «nessun evento»: potrebbero arrivare. */
  isLoading: boolean;
  /** «Maggio 2099», per il messaggio di elenco vuoto. */
  monthLabel: string;
}

/**
 * Lo stesso mese sotto `md`, come elenco dei soli giorni che hanno
 * eventi: una griglia di sette colonne su un telefono non si legge.
 */
export default function MonthList({
  grid,
  view,
  today,
  eventsByDay,
  isPast,
  onSelect,
  isLoading,
  monthLabel,
}: MonthListProps) {
  return (
    <div className="md:hidden space-y-3">
      {grid
        .flat()
        .filter((c) => c.m === view.m)
        .map((cell) => {
          const key = ymdKey(cell);
          const dayEvents = eventsByDay.get(key) ?? [];
          if (dayEvents.length === 0) return null;
          const isToday = cell.y === today.y && cell.m === today.m && cell.d === today.d;
          return (
            <div
              key={key}
              className="rounded-lg border border-border/50 bg-card/60 overflow-hidden"
            >
              <div
                className={cn(
                  "px-3 py-1.5 flex items-center justify-between text-xs font-heading uppercase tracking-widest border-b border-border/40",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                <span>
                  {cell.d} {MONTH_LABELS[cell.m - 1]}
                </span>
                <span>{dayEvents.length} eventi</span>
              </div>
              <ul className="divide-y divide-border/40">
                {dayEvents.map((ev) => {
                  const past = isPast(ev.date);
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(ev)}
                        aria-label={`${romeHHMM(ev.date)} ${SPORT_LABEL[ev.sport]}: ${ev.shortLabel} (${ev.context})${past ? ", concluso" : ""}. Apri i dettagli`}
                        className={cn(
                          "w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/40",
                          past && "opacity-50 grayscale",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 rounded-full shrink-0",
                            SPORT_DOT[ev.sport],
                          )}
                        />
                        <span className={cn("flex-1 min-w-0", past && "line-through")}>
                          <span className="block text-sm font-semibold truncate">
                            {ev.shortLabel}{" "}
                            <span className="text-muted-foreground font-normal">
                              · {ev.context}
                            </span>
                          </span>
                          <span className="block text-xs text-muted-foreground font-mono mt-0.5">
                            {romeHHMM(ev.date)} · {SPORT_LABEL[ev.sport]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      {!isLoading &&
        grid
          .flat()
          .filter((c) => c.m === view.m)
          .every((c) => (eventsByDay.get(ymdKey(c)) ?? []).length === 0) && (
          <p className="text-center text-muted-foreground py-12">Nessun evento in {monthLabel}</p>
        )}
    </div>
  );
}
