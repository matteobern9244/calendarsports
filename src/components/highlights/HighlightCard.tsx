import { motion } from "framer-motion";
import { Play, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateIT, formatRelativeIT, toRomeDate } from "@/lib/dateUtils";

export interface HighlightItem {
  videoId: string;
  title: string;
  publishedAt: string;
  source: string;
  url: string;
  thumbnailUrl: string;
}

interface HighlightCardProps {
  item: HighlightItem;
  accentVar?: string; // CSS var name (es. "gold", "brand-ferrari")
}

function isNew(publishedAt: string): boolean {
  const d = toRomeDate(publishedAt);
  if (!d) return false;
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
}

export default function HighlightCard({ item, accentVar = "gold" }: HighlightCardProps) {
  const accent = `hsl(var(--${accentVar}))`;
  const fresh = isNew(item.publishedAt);
  const dateLabel = formatDateIT(item.publishedAt);
  const relative = formatRelativeIT(item.publishedAt);

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Guarda su YouTube: ${item.title}`}
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden",
        "transition-[box-shadow,border-color,transform] duration-300 ease-out",
        "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
        "hover:shadow-[0_18px_44px_-22px_hsl(var(--gold)/0.55),0_4px_12px_-6px_hsl(var(--navy-dark)/0.4)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      style={{ ["--ring" as string]: accent }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[var(--accent-line)] to-transparent opacity-70"
        style={{ ["--accent-line" as string]: accent }}
      />

      {/* Thumbnail 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        {/* Gradient overlay per leggibilità */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"
        />
        {/* Play button center */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-black/70"
            style={{ boxShadow: `0 0 0 0 ${accent}` }}
          >
            <Play className="h-6 w-6 fill-white text-white" aria-hidden="true" />
          </span>
        </div>

        {/* Badge "NUOVO" top-left */}
        {fresh && (
          <span
            className="absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[9px] font-heading font-bold uppercase tracking-widest text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--gold)/0.6)]"
            style={{
              background: `linear-gradient(90deg, hsl(var(--gold-dark)), hsl(var(--gold)), hsl(var(--gold-light)))`,
            }}
          >
            Nuovo
          </span>
        )}

        {/* Badge data top-right */}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[10px] font-heading font-semibold tracking-wider text-foreground border border-border/60">
          {dateLabel}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-sm sm:text-base font-bold leading-snug text-foreground line-clamp-2">
          {item.title}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Youtube className="h-3.5 w-3.5 flex-shrink-0" style={{ color: accent }} aria-hidden="true" />
            <span className="truncate font-semibold text-foreground/80">{item.source || "YouTube"}</span>
          </span>
          {relative && (
            <span className="font-heading uppercase tracking-wider text-[10px] whitespace-nowrap">
              {relative}
            </span>
          )}
        </div>
      </div>
    </motion.a>
  );
}