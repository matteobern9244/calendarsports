import { cn } from "@/lib/utils";

/**
 * Il punteggio di una partita, scritto in un posto solo.
 *
 * Era ripetuto a mano in tre punti — il blocco risultato del dettaglio, la
 * testata della pagina partita e la riga di calendario — e le tre copie erano
 * gia' divergenti: due usavano il trattino lungo `–`, la terza il trattino
 * corto, e i numeri tabellari c'erano solo in due su tre, cosi' la colonna del
 * calendario si spostava a ogni riga.
 *
 * Nessuna delle tre si faceva leggere: «2–0» per uno screen reader e' «due
 * meno zero», o niente. Il punteggio e' il dato per cui si apre la pagina.
 */

/** Quanto in grande, deciso dal contesto e non da classi passate a mano. */
type Scala = "riga" | "card" | "hero";

const SCALE: Record<Scala, string> = {
  riga: "text-sm gap-1",
  card: "text-xl sm:text-2xl gap-1.5",
  hero: "text-3xl sm:text-5xl gap-2",
};

const SEPARATORE: Record<Scala, string> = {
  riga: "text-xs",
  card: "text-base",
  hero: "text-xl sm:text-2xl",
};

interface MatchScoreProps {
  score: { home: number; away: number } | null;
  scala?: Scala;
  /** Cosa mostrare quando non c'e' un punteggio: «vs» nella testata, «—» nelle righe. */
  fallback?: React.ReactNode;
  className?: string;
}

export default function MatchScore({
  score,
  scala = "card",
  fallback = null,
  className,
}: MatchScoreProps) {
  if (!score) {
    return fallback === null ? null : <span className={className}>{fallback}</span>;
  }

  return (
    <span className={cn("inline-flex items-baseline", SCALE[scala], className)}>
      <span aria-hidden="true" className="font-heading font-bold tabular-nums">
        {score.home}
      </span>
      <span aria-hidden="true" className={cn("text-muted-foreground", SEPARATORE[scala])}>
        –
      </span>
      <span aria-hidden="true" className="font-heading font-bold tabular-nums">
        {score.away}
      </span>
      {/* Il trattino non si legge: a parole il punteggio e' «due a zero». */}
      <span className="sr-only">{`${score.home} a ${score.away}`}</span>
    </span>
  );
}
