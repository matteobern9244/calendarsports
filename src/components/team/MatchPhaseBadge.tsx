import { CalendarClock, Radio } from "lucide-react";
import type { FasePartita } from "@/lib/matchPhase";
import { cn } from "@/lib/utils";

/**
 * L'etichetta che dice a che punto e' una partita.
 *
 * Vive in un componente perche' la stessa frase serve a tre viste — la card in
 * testa alla pagina squadra, la riga di calendario, la testata del dettaglio —
 * e finche' ognuna se la scriveva da sola potevano contraddirsi nella stessa
 * schermata. E' successo: la card annunciava «PROSSIMA PARTITA» mentre il
 * conto alla rovescia accanto lampeggiava «IN DIRETTA · da 54m».
 *
 * Il «da quanto» non sta qui: lo dice gia' `EventCountdown`, che ha
 * l'orologio. Questo componente dice soltanto **quale** fase.
 */

const TESTO: Record<FasePartita, string> = {
  prepartita: "Prossima Partita",
  "in-corso": "In corso",
  finita: "Terminata",
};

interface MatchPhaseBadgeProps {
  fase: FasePartita;
  className?: string;
}

export default function MatchPhaseBadge({ fase, className }: MatchPhaseBadgeProps) {
  const inCorso = fase === "in-corso";
  const finita = fase === "finita";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {inCorso ? (
        <>
          <Radio className="h-4 w-4 text-destructive" aria-hidden="true" />
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-destructive animate-pulse" />
          </span>
        </>
      ) : (
        <CalendarClock
          className={cn(
            "h-4 w-4",
            finita ? "text-muted-foreground" : "text-[hsl(var(--team-accent))]",
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          "font-heading text-[10px] tracking-[0.2em] uppercase font-bold",
          inCorso
            ? "text-destructive"
            : finita
              ? "text-muted-foreground"
              : "text-[hsl(var(--team-accent-text))]",
        )}
      >
        {TESTO[fase]}
      </span>
    </span>
  );
}
