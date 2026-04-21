import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { daysUntilRome } from "@/lib/dateUtils";
import { Sparkles, Clock, CalendarClock, Check } from "lucide-react";
import { getNowMinute, subscribeCountdown } from "@/lib/countdownClock";

interface ReleaseCountdownBadgeProps {
  releaseDate: string;
  className?: string;
}

/**
 * Piccolo badge che mostra la distanza in giorni di calendario tra
 * `releaseDate` e oggi (fuso Europe/Rome). Renderizza `null` se la data
 * non è valida. Varianti:
 * - "Oggi" / "Domani" → accento gold
 * - "Tra N giorni" → outline neutro
 * - "Già uscito" → muted
 */
export default function ReleaseCountdownBadge({
  releaseDate,
  className,
}: ReleaseCountdownBadgeProps) {
  // Sottoscrizione al clock globale a risoluzione "minute": basta un
  // refresh ogni 30s per cogliere il cambio di giorno a Roma. Lo snapshot
  // restituito cambia solo ai cambi minuto reali → nessun re-render extra.
  useSyncExternalStore(
    (cb) => subscribeCountdown(cb, "minute"),
    getNowMinute,
    getNowMinute,
  );
  const diff = daysUntilRome(releaseDate);
  if (diff === null) return null;

  let label: string;
  let tone: "today" | "soon" | "future" | "past";
  let ariaLabel: string;
  let Icon: typeof Sparkles;

  if (diff === 0) {
    label = "Oggi";
    tone = "today";
    ariaLabel = "Esce oggi";
    Icon = Sparkles;
  } else if (diff === 1) {
    label = "Domani";
    tone = "soon";
    ariaLabel = "Esce domani";
    Icon = Clock;
  } else if (diff > 1) {
    label = `Tra ${diff} giorni`;
    tone = "future";
    ariaLabel = `Mancano ${diff} giorni all'uscita`;
    Icon = CalendarClock;
  } else {
    label = "Già uscito";
    tone = "past";
    ariaLabel = `Già uscito da ${Math.abs(diff)} giorn${Math.abs(diff) === 1 ? "o" : "i"}`;
    Icon = Check;
  }

  const toneClasses: Record<typeof tone, string> = {
    today:
      "bg-[hsl(var(--gold))]/15 border-[hsl(var(--gold))]/50 text-[hsl(var(--gold))]",
    soon:
      "bg-[hsl(var(--gold))]/10 border-[hsl(var(--gold))]/35 text-[hsl(var(--gold))]",
    future: "bg-transparent border-border/70 text-foreground/80",
    past: "bg-muted/60 border-transparent text-muted-foreground",
  };

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-heading uppercase tracking-wider whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}