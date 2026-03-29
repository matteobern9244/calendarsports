import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface EventCardProps {
  sport: string;
  sportColor?: string;
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  status?: "prossimo" | "in_corso" | "completato";
  children?: React.ReactNode;
  className?: string;
}

export default function EventCard({
  sport,
  title,
  subtitle,
  date,
  time,
  status = "prossimo",
  children,
  className,
}: EventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-heading font-bold tracking-[0.2em] uppercase text-primary">
          {sport}
        </span>
        {status === "in_corso" && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
        {status === "completato" && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Completato
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-heading text-lg font-bold leading-tight text-foreground mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground mb-3">{subtitle}</p>}

      {/* Date/Time */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {date}
        </span>
        {time && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </span>
        )}
      </div>

      {children && <div className="mt-4 pt-3 border-t border-border/50">{children}</div>}
    </motion.div>
  );
}
