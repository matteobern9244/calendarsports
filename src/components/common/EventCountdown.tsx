import { useMemo, useSyncExternalStore } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNowSecond, subscribeCountdown } from "@/lib/countdownClock";

interface EventCountdownProps {
  /** ISO date string of the event start */
  startDate: string;
  className?: string;
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

export default function EventCountdown({ startDate, className }: EventCountdownProps) {
  const target = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const valid = Number.isFinite(target);

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

  if (!valid) return null;

  // Live window: ±3h around start time
  const isLive = parts.totalMs === 0 && now - target < 3 * 3600 * 1000;
  const isPast = parts.totalMs === 0 && !isLive;

  if (isPast) return null;

  if (isLive) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1",
          "text-[10px] font-heading font-bold uppercase tracking-widest text-destructive",
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
        Inizio imminente
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
