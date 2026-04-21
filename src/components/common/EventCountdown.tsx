import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AlertCircle, RefreshCw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNowSecond, subscribeCountdown } from "@/lib/countdownClock";

export type CountdownStatus = "upcoming" | "live" | "ended";

interface EventCountdownProps {
  /** ISO date string of the event start */
  startDate: string;
  /**
   * Optional ISO end date. Quando assente, la finestra "live" viene stimata
   * come `startDate + 3h` (fallback storico). Quando presente, la
   * transizione `live -> ended` segue il timestamp reale fornito dalla
   * fonte dati.
   */
  endDate?: string;
  className?: string;
  /**
   * Callback opzionale: riceve lo stato corrente del countdown ad ogni
   * cambio di fase (`upcoming` -> `live` -> `ended`). Permette al parent
   * (es. `EventCard`) di reagire in tempo reale senza dover calcolare
   * lo stato in modo statico.
   */
  onStatusChange?: (status: CountdownStatus) => void;
  /**
   * Quando `startDate` non e' parsabile, mostra un piccolo bottone
   * "Riprova" accanto al messaggio di errore. Tipicamente collegato al
   * `refetch()` della query React Query della pagina.
   */
  onRetry?: () => void;
}

interface Parts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function getPartsAt(target: number, now: number): Parts {
  const diff = Math.max(0, target - now);
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalMs: diff,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

export default function EventCountdown({
  startDate,
  endDate,
  className,
  onStatusChange,
  onRetry,
}: EventCountdownProps) {
  const target = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const valid = Number.isFinite(target);
  const endTarget = useMemo(() => {
    if (endDate) {
      const t = new Date(endDate).getTime();
      if (Number.isFinite(t)) return t;
    }
    // Fallback storico: finestra live = start + 3h.
    return valid ? target + 3 * 3600 * 1000 : 0;
  }, [endDate, target, valid]);

  // Real-time: tutti i countdown si abbonano al clock globale a risoluzione
  // "second" cosi' i secondi scorrono sempre, senza eccezioni. Il clock e'
  // unico per l'intera app (vedi countdownClock.ts) e tutti i chip
  // condividono lo stesso istante nello stesso commit React, quindi non
  // esiste flicker o sfasamento tra card adiacenti. Quando la tab e' in
  // background il timer si ferma e riparte al ritorno con un tick immediato.
  const now = useSyncExternalStore(
    (cb) => subscribeCountdown(cb, "second"),
    getNowSecond,
    getNowSecond,
  );

  const parts = useMemo(
    () => getPartsAt(valid ? target : 0, now),
    [target, valid, now],
  );

  // Stato derivato dal clock globale: cambia automaticamente nel momento
  // esatto in cui l'evento inizia / finisce, senza setState interno.
  const status: CountdownStatus = !valid
    ? "ended"
    : now < target
      ? "upcoming"
      : now < endTarget
        ? "live"
        : "ended";

  // Propaga al parent solo quando lo stato cambia davvero.
  const lastStatusRef = useRef<CountdownStatus | null>(null);
  useEffect(() => {
    if (lastStatusRef.current === status) return;
    lastStatusRef.current = status;
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  if (!valid) {
    return (
      <div
        role="status"
        aria-label="Orario non disponibile"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/30 bg-muted/40 px-2.5 py-1",
          "text-[10px] font-heading uppercase tracking-widest text-muted-foreground",
          className,
        )}
      >
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        <span>Orario non disponibile</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Riprova a caricare l'orario"
          >
            <RefreshCw className="h-2.5 w-2.5" aria-hidden="true" />
            Riprova
          </button>
        )}
      </div>
    );
  }

  if (status === "ended") return null;

  if (status === "live") {
    const liveSinceMin = Math.max(0, Math.floor((now - target) / 60_000));
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1",
          "text-[10px] font-heading font-bold uppercase tracking-widest text-destructive",
          className,
        )}
        aria-label={`In diretta da ${liveSinceMin} minuti`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
        <span>In diretta</span>
        {liveSinceMin > 0 && (
          <span className="text-destructive/80 font-semibold normal-case tracking-normal">
            · da {liveSinceMin}m
          </span>
        )}
      </div>
    );
  }

  const showDays = parts.days > 0;
  const showHours = parts.days > 0 || parts.hours > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5 px-2.5 py-1",
        "text-[11px] font-heading font-semibold tracking-wider text-foreground",
        className
      )}
      aria-label="Tempo mancante all'evento"
    >
      <Timer className="h-3 w-3 text-[hsl(var(--gold))]" />
      <div className="flex items-baseline gap-1 tabular-nums">
        {showDays && (
          <>
            <span className="font-bold">{parts.days}</span>
            <span className="text-[9px] uppercase text-muted-foreground">g</span>
          </>
        )}
        {showHours && (
          <>
            <span className="font-bold">{pad(parts.hours)}</span>
            <span className="text-[9px] uppercase text-muted-foreground">h</span>
          </>
        )}
        <span className="font-bold">{pad(parts.minutes)}</span>
        <span className="text-[9px] uppercase text-muted-foreground">m</span>
        {/* Secondi sempre visibili: countdown realmente in real-time */}
        <span className="font-bold">{pad(parts.seconds)}</span>
        <span className="text-[9px] uppercase text-muted-foreground">s</span>
      </div>
    </div>
  );
}
