import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import EventCountdown, { type CountdownStatus } from "./EventCountdown";

interface EventCardProps {
  sport: string;
  sportColor?: string;
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  /** ISO date string of the event start, used for live countdown */
  startDate?: string;
  /**
   * ISO date string opzionale di fine evento (es. weekend MotoGP). Quando
   * presente, la transizione `in_corso -> completato` segue il timestamp
   * reale invece del fallback ±3h.
   */
  endDate?: string;
  status?: "prossimo" | "in_corso" | "completato";
  highlight?: boolean;
  children?: React.ReactNode;
  className?: string;
  /**
   * Callback opzionale per il bottone "Riprova" mostrato quando
   * `startDate` non e' parsabile.
   */
  onRetry?: () => void;
  /**
   * Quando definito la card diventa interattiva (button + tastiera) e
   * apre il dettaglio evento al click.
   */
  onClick?: () => void;
}

export default function EventCard({
  sport,
  title,
  subtitle,
  date,
  time,
  startDate,
  endDate,
  status = "prossimo",
  highlight = false,
  children,
  className,
  onRetry,
  onClick,
}: EventCardProps) {
  // Stato live derivato in tempo reale dal countdown: appena l'evento
  // entra nella finestra "in corso" (in base a startDate/endDate reali) il
  // badge in alto a destra passa automaticamente a "IN DIRETTA" senza
  // dover ricaricare la pagina ne aspettare il prossimo refetch.
  const [liveStatus, setLiveStatus] = useState<CountdownStatus | null>(null);
  const effectiveStatus =
    liveStatus === "live"
      ? "in_corso"
      : liveStatus === "ended"
        ? "completato"
        : status;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "group relative rounded-2xl border bg-card p-5",
        "transition-[box-shadow,border-color,transform] duration-300 ease-out",
        "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
        "hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
        onClick && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        highlight
          ? "border-[hsl(var(--gold))]/60 ring-1 ring-[hsl(var(--gold))]/25 hover:border-[hsl(var(--gold))]/80"
          : "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
        className
      )}
    >
      {/* Top gold accent line */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          "bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent",
          "opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        )}
      />
      {/* Soft gold glow on hover */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-px rounded-2xl",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-[radial-gradient(circle_at_top,hsl(var(--gold)/0.10),transparent_60%)]"
        )}
      />
      {highlight && (
        <span className="absolute -top-2.5 left-4 z-[2] rounded-full bg-gradient-to-r from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] px-2.5 py-0.5 text-[9px] font-heading font-bold uppercase tracking-widest text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.6)]">
          Prossimo
        </span>
      )}
      {/* Header */}
      <div className="relative z-[1] flex items-center justify-between mb-3">
        <span className="text-[10px] font-heading font-bold tracking-[0.2em] uppercase text-primary">
          {sport}
        </span>
        {effectiveStatus === "in_corso" && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            IN DIRETTA
          </span>
        )}
        {effectiveStatus === "completato" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Completato
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="relative z-[1] font-heading text-lg font-bold leading-tight text-foreground mb-1">{title}</h3>
      {subtitle && <p className="relative z-[1] text-sm text-muted-foreground mb-3">{subtitle}</p>}

      {/* Date/Time */}
      <div className="relative z-[1] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5" />
          {date}
        </span>
        {time && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </span>
        )}
        {startDate && effectiveStatus !== "completato" && (
          <EventCountdown
            startDate={startDate}
            endDate={endDate}
            onStatusChange={setLiveStatus}
            onRetry={onRetry}
            className="ml-auto"
          />
        )}
      </div>

      {children && <div className="relative z-[1] mt-4 pt-3 border-t border-border/50">{children}</div>}
    </motion.div>
  );
}
