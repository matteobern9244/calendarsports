import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { formatDayHeaderIT, romeHHMM, type RomeYMD } from "@/lib/calendarGrid";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SPORT_DOT, SPORT_LABEL } from "./sportStyles";

interface DayEventsDialogProps {
  /** Il giorno aperto; `null` tiene il dialogo chiuso. */
  day: RomeYMD | null;
  /** Tutti gli eventi di quel giorno, gia' filtrati e ordinati per ora. */
  events: CalendarItem[];
  /** Un evento gia' cominciato si mostra ingrigito e barrato. */
  isPast: (iso: string) => boolean;
  /** L'utente ha scelto un evento: sta al chiamante aprirne il dettaglio. */
  onSelect: (event: CalendarItem) => void;
  /** Chiusura richiesta dall'utente: Esc, clic fuori, o la X. */
  onClose: () => void;
}

/**
 * L'elenco completo degli eventi di un giorno.
 *
 * Nasce per «+N altri» della griglia mensile, che mostra quattro eventi
 * per cella: fino al 5 settembre 2026 quel bottone prometteva gli altri e
 * ne apriva uno solo, il quinto. Da qui l'utente li vede tutti e sceglie.
 *
 * Gli eventi arrivano dall'esterno invece di essere copiati al clic: se
 * mentre il dialogo e' aperto si spegne il filtro di uno sport, l'elenco
 * segue, invece di mostrare una fotografia scaduta.
 */
export default function DayEventsDialog({
  day,
  events,
  isPast,
  onSelect,
  onClose,
}: DayEventsDialogProps) {
  return (
    <Dialog open={day !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {day && (
          <>
            <DialogHeader>
              <DialogTitle className="text-left font-heading tracking-wide">
                {formatDayHeaderIT(day)}
              </DialogTitle>
              <DialogDescription className="text-left">
                {events.length === 1
                  ? "1 evento in calendario"
                  : `${events.length} eventi in calendario`}
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y divide-border/40 -mx-1 max-h-[60vh] overflow-y-auto">
              {events.map((ev) => {
                const past = isPast(ev.date);
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(ev)}
                      aria-label={`${romeHHMM(ev.date)} ${SPORT_LABEL[ev.sport]}: ${ev.shortLabel} (${ev.context})${past ? ", concluso" : ""}. Apri i dettagli`}
                      className={cn(
                        "w-full text-left px-3 py-2 flex items-start gap-2 rounded hover:bg-muted/40 transition-colors",
                        past && "opacity-50 grayscale",
                      )}
                    >
                      <span
                        className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SPORT_DOT[ev.sport])}
                      />
                      <span className={cn("flex-1 min-w-0", past && "line-through")}>
                        <span className="block text-sm font-semibold truncate">
                          {ev.shortLabel}{" "}
                          <span className="text-muted-foreground font-normal">· {ev.context}</span>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
