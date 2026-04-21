import { ExternalLink, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReleaseCredits,
  type ReleaseItem,
} from "@/hooks/useStreamingData";
import type { StreamingProviderId } from "@/lib/api/sportsApi";
import { formatDateIT } from "@/lib/dateUtils";
import ReleaseCountdownBadge from "@/components/streaming/ReleaseCountdownBadge";

const PROVIDER_HOMEPAGES: Record<StreamingProviderId, string> = {
  netflix: "https://www.netflix.com",
  prime: "https://www.primevideo.com",
  disney: "https://www.disneyplus.com",
  hbo: "https://www.max.com",
};

interface Props {
  item: ReleaseItem | null;
  provider: StreamingProviderId;
  providerLabel: string;
  onClose: () => void;
}

export default function ReleaseDetailDialog({
  item,
  provider,
  providerLabel,
  onClose,
}: Props) {
  const credits = useReleaseCredits(
    item?.type ?? null,
    item?.tmdbId ?? null,
  );

  const open = !!item;
  const tmdbUrl = item
    ? `https://www.themoviedb.org/${item.type}/${item.tmdbId}`
    : "#";
  const providerHomepage = PROVIDER_HOMEPAGES[provider];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {item && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {item.type === "movie" ? "Film" : "Serie"}
                </Badge>
                {item.releaseDate && (
                  <>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatDateIT(item.releaseDate)}
                    </Badge>
                    <ReleaseCountdownBadge releaseDate={item.releaseDate} />
                  </>
                )}
                {item.voteAverage !== null && item.voteAverage > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    ★ {item.voteAverage.toFixed(1)}
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-heading text-2xl tracking-wide">
                {item.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Dettaglio uscita {item.title} su {providerLabel}
              </DialogDescription>
            </DialogHeader>

            <div className="grid sm:grid-cols-[180px_1fr] gap-5 mt-2">
              <div className="shrink-0">
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full rounded-md aspect-[2/3] object-cover border border-border/60"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center rounded-md">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                {item.overview ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {item.overview}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nessuna sinossi disponibile.
                  </p>
                )}

                <div>
                  <h4 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    Cast principale
                  </h4>
                  {credits.isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  )}
                  {credits.isError && (
                    <p className="text-xs text-muted-foreground">
                      Cast non disponibile.
                    </p>
                  )}
                  {credits.isSuccess && credits.data.cast.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Cast non disponibile su TMDB.
                    </p>
                  )}
                  {credits.isSuccess && credits.data.cast.length > 0 && (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {credits.data.cast.slice(0, 6).map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-2 text-xs bg-muted/40 rounded-md p-2 min-w-0"
                        >
                          {c.profile ? (
                            <img
                              src={c.profile}
                              alt={c.name}
                              loading="lazy"
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{c.name}</p>
                            {c.character && (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {c.character}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button asChild size="sm" className="gap-2">
                    <a
                      href={providerHomepage}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Vai a {providerLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <a
                      href={tmdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Dettagli su TMDB
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
