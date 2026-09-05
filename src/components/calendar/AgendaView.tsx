import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { formatDayHeaderIT, romeHHMM, type RomeYMD } from "@/lib/calendarGrid";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SPORT_BADGE, SPORT_DOT, SPORT_LABEL } from "./sportStyles";

export interface AgendaDay {
  ymd: RomeYMD;
  key: string;
  events: CalendarItem[];
}

interface AgendaViewProps {
  /** Solo i giorni con almeno un evento, gia' filtrati e ordinati. */
  agendaDays: AgendaDay[];
  /** Il giorno di oggi in fuso italiano, per evidenziare la cella. */
  today: RomeYMD;
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
 * La vista agenda: un elenco continuo per giorno, con l'emittente TV
 * accanto all'evento, che la griglia non ha spazio di mostrare.
 */
export default function AgendaView({
  agendaDays,
  today,
  isPast,
  onSelect,
  isLoading,
  monthLabel,
}: AgendaViewProps) {
  return (
    <div className="space-y-3">
      {agendaDays.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-12">Nessun evento in {monthLabel}</p>
      )}
      {agendaDays.map(({ ymd, key, events: dayEvents }) => {
        const isToday = ymd.y === today.y && ymd.m === today.m && ymd.d === today.d;
        return (
          <section
            key={key}
            className="rounded-lg border border-border/50 bg-card/60 overflow-hidden"
          >
            <header
              className={cn(
                "sticky top-0 z-10 px-3 py-2 flex items-center justify-between text-xs font-heading uppercase tracking-widest border-b border-border/40 backdrop-blur-sm",
                isToday
                  ? "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]"
                  : "bg-muted/40 text-muted-foreground",
              )}
            >
              <span>{formatDayHeaderIT(ymd)}</span>
              <span>
                {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventi"}
              </span>
            </header>
            <ul className="divide-y divide-border/40">
              {dayEvents.map((ev) => {
                const past = isPast(ev.date);
                return (
                  <li key={ev.id}>
                    <button
                      onClick={() => onSelect(ev)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/40 transition-colors",
                        past && "opacity-50 grayscale",
                      )}
                    >
                      <span
                        className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SPORT_DOT[ev.sport])}
                      />
                      <span className="font-mono text-xs text-muted-foreground w-12 shrink-0 mt-0.5">
                        {romeHHMM(ev.date)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-heading uppercase tracking-widest shrink-0 mt-0.5",
                          SPORT_BADGE[ev.sport],
                        )}
                      >
                        {SPORT_LABEL[ev.sport]}
                      </Badge>
                      <span className={cn("flex-1 min-w-0", past && "line-through")}>
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
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
