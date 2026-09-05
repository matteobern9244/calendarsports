import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { WEEKDAY_LABELS, romeHHMM, ymdKey, type RomeYMD } from "@/lib/calendarGrid";
import { cn } from "@/lib/utils";
import { SPORT_DOT, SPORT_LABEL } from "./sportStyles";

interface MonthGridProps {
  /** Le sei settimane del mese, giorni di bordo compresi. */
  grid: RomeYMD[][];
  /** Il mese mostrato: i giorni di altri mesi restano visibili, sbiaditi. */
  view: RomeYMD;
  /** Il giorno di oggi in fuso italiano, per evidenziare la cella. */
  today: RomeYMD;
  /** Eventi del giorno, indicizzati per chiave `YYYY-MM-DD` romana. */
  eventsByDay: Map<string, CalendarItem[]>;
  /** Un evento gia' cominciato si mostra ingrigito e barrato. */
  isPast: (iso: string) => boolean;
  /** Apre il dettaglio dell'evento. */
  onSelect: (event: CalendarItem) => void;
}

/**
 * La griglia mensile, da `md` in su. Mostra al massimo quattro eventi per
 * giorno; il resto finisce dietro «+N altri».
 */
export default function MonthGrid({
  grid,
  view,
  today,
  eventsByDay,
  isPast,
  onSelect,
}: MonthGridProps) {
  return (
    <div className="hidden md:block rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs overflow-hidden">
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
      <div className="grid grid-cols-7 grid-rows-6 auto-rows-[minmax(120px,1fr)]">
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
                {visible.map((ev) => {
                  const past = isPast(ev.date);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelect(ev)}
                      // Il nome accessibile dev'essere una frase, non la
                      // somma degli span: letti di fila davano
                      // "21:00 F1: Imola (Gara)" senza dire che il bottone
                      // apre qualcosa. E lo stato "concluso" era affidato
                      // al solo `line-through`, che uno screen reader non
                      // vede.
                      aria-label={`${romeHHMM(ev.date)} ${SPORT_LABEL[ev.sport]}: ${ev.shortLabel} (${ev.context})${past ? ", concluso" : ""}. Apri i dettagli`}
                      className={cn(
                        "group flex items-start gap-1 text-left text-[11px] leading-tight px-1 py-0.5 rounded hover:bg-muted/50 transition-colors",
                        past && "opacity-50 grayscale line-through",
                      )}
                      title={`${romeHHMM(ev.date)} ${ev.title}${past ? " (concluso)" : ""}`}
                    >
                      <span
                        className={cn(
                          "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                          SPORT_DOT[ev.sport],
                        )}
                      />
                      <span className="truncate">
                        <span className="font-mono">{romeHHMM(ev.date)}</span>{" "}
                        <span className="font-semibold uppercase tracking-wide">
                          {SPORT_LABEL[ev.sport]}:
                        </span>{" "}
                        <span>{ev.shortLabel}</span>{" "}
                        <span className="text-muted-foreground">({ev.context})</span>
                      </span>
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelect(dayEvents[4])}
                    // Il testo visibile dice "+N altri" ma il bottone apre
                    // il dettaglio del quinto evento, non una lista.
                    // L'etichetta accessibile parte dal testo visibile
                    // (WCAG 2.5.3) e poi dice cosa succede davvero,
                    // invece di lasciare che sia una sorpresa.
                    aria-label={`+${hidden} altri: apri i dettagli di ${dayEvents[4].shortLabel}`}
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
  );
}
