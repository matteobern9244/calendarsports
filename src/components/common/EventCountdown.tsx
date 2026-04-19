import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

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

function getParts(target: number): Parts {
  const now = Date.now();
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
  const target = new Date(startDate).getTime();
  const valid = !Number.isNaN(target);
  const [parts, setParts] = useState<Parts>(() => (valid ? getParts(target) : getParts(Date.now())));

  useEffect(() => {
    if (!valid) return;
    setParts(getParts(target));
    const id = window.setInterval(() => setParts(getParts(target)), 1000);
    return () => window.clearInterval(id);
  }, [target, valid]);

  if (!valid) return null;

  // Live window: ±3h around start time
  const isLive = parts.totalMs === 0 && Date.now() - target < 3 * 3600 * 1000;
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
        {!showDays && (
          <>
            <span className="font-bold">{pad(parts.seconds)}</span>
            <span className="text-[9px] uppercase text-muted-foreground">s</span>
          </>
        )}
      </div>
    </div>
  );
}
