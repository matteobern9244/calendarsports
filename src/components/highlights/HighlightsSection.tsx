import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useHighlights } from "@/hooks/useSportsData";
import type { HighlightSport } from "@/lib/api/sportsApi";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import HighlightCard, { type HighlightItem } from "./HighlightCard";

interface HighlightsSectionProps {
  sport: HighlightSport;
  /** Nome variabile CSS HSL per accent (es. "gold", "brand-ferrari"). Default "gold". */
  accentVar?: string;
  limit?: number;
}

export default function HighlightsSection({
  sport,
  accentVar = "gold",
  limit = 12,
}: HighlightsSectionProps) {
  const { data, isLoading, error, refetch } = useHighlights(sport, limit);
  const items = (data ?? []) as HighlightItem[];

  // L'edge function ritorna meta.playlistUrl ma `data` qui è solo l'array.
  // Costruiamo l'URL playlist dal primo videoId? No: usiamo i playlist id pubblici noti
  // mantenendoli sincronizzati lato client per il CTA "Vedi tutti su YouTube".
  const PLAYLIST_URLS: Record<HighlightSport, string> = {
    juventus: "https://www.youtube.com/playlist?list=PLamQuNkRTV0eQ-UiYDCuz_WUHOlri1BY3",
    f1: "https://www.youtube.com/playlist?list=PLZbcTUGG8ELs188DCvpKMVFsnia-uB3j8",
    motogp: "https://www.youtube.com/playlist?list=PLMgcIchslSqgqxtkUg4iiqc1UL8u8uFey",
  };
  const playlistUrl = PLAYLIST_URLS[sport];

  return (
    <section aria-label="Highlights video">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight uppercase text-gold-gradient">
            Highlights
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ultimi video dal canale ufficiale · aggiornati ogni 10 minuti
          </p>
        </div>
        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-[hsl(var(--gold))]/40 bg-[hsl(var(--gold))]/5 px-3 py-1.5 text-[11px] font-heading font-bold uppercase tracking-wider text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Vedi playlist completa
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {isLoading && <LoadingState message="Caricamento highlights..." />}
      {error && (
        <ErrorState
          message="Impossibile caricare gli highlights da YouTube."
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState message="Nessun highlight disponibile al momento." />
      )}

      {items.length > 0 && (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {items.map((item) => (
            <HighlightCard key={item.videoId} item={item} accentVar={accentVar} />
          ))}
        </motion.div>
      )}

      {items.length > 0 && (
        <div className="mt-6 text-center">
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Fonte: YouTube · playlist ufficiale
          </a>
        </div>
      )}
    </section>
  );
}