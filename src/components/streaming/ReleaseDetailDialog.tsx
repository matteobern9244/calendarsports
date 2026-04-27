import { ExternalLink, Sparkles, Film, Clapperboard, Play } from "lucide-react";
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
  useReleaseDetails,
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
  const detailsQuery = useReleaseDetails(
    item?.type ?? null,
    item?.tmdbId ?? null,
  );
  const details = detailsQuery.data;

  const open = !!item;
  const tmdbUrl = item
    ? `https://www.themoviedb.org/${item.type}/${item.tmdbId}`
    : "#";
  const providerHomepage = PROVIDER_HOMEPAGES[provider];
  // Per la vista "Catalogo Italia" preferiamo il link JustWatch del titolo
  // (TMDB results.IT.link) che porta alla pagina di disponibilità Italia.
  const justWatchLink = details?.justWatchLink ?? item?.justWatchLink ?? null;
  const targetUrl = justWatchLink ?? item?.deepLink ?? providerHomepage;
  const targetLabel = justWatchLink
    ? "Vedi dove è disponibile"
    : `Vai a ${providerLabel}`;

  const overview = details?.overview ?? item?.overview ?? "";
  const genres = details?.genres ?? item?.genres ?? [];
  const year = details?.year ?? item?.year ?? null;
  const cast = details?.cast ?? [];
  const providers = details?.availableProviders ?? item?.availableProviders ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {item && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {item.type === "movie" ? "Film" : "Serie"}
                  {year ? ` · ${year}` : ""}
                </Badge>
                {item.releaseDate && (
                  <>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatDateIT(item.releaseDate)}
                    </Badge>
                    <ReleaseCountdownBadge releaseDate={item.releaseDate} />
                  </>
                )}
                {details?.runtime && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                  </Badge>
                )}
                {details?.numberOfSeasons && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {details.numberOfSeasons} stagion{details.numberOfSeasons === 1 ? "e" : "i"}
                  </Badge>
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
              {genres.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {genres.join(" · ")}
                </p>
              )}
              <DialogDescription className="sr-only">
                Dettaglio uscita {item.title}
              </DialogDescription>
            </DialogHeader>

            <div className="grid sm:grid-cols-[180px_1fr] gap-5 mt-2">
              <div className="shrink-0">
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    width={342}
                    height={513}
                    className="w-full rounded-md aspect-[2/3] object-cover border border-border/60"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center rounded-md">
                    <Sparkles className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-4 min-w-0">
                {overview ? (
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {overview}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nessuna sinossi disponibile.
                  </p>
                )}

                {(details?.directors?.length ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="uppercase tracking-widest font-heading mr-1">
                      Regia:
                    </span>
                    {details!.directors.join(", ")}
                  </p>
                )}
                {(details?.creators?.length ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="uppercase tracking-widest font-heading mr-1">
                      Creatori:
                    </span>
                    {details!.creators.join(", ")}
                  </p>
                )}

                {/* Disponibile su (provider IT da TMDB) */}
                {providers.length > 0 && (
                  <div>
                    <h4 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      Disponibile su (Italia)
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {providers.map((p) => (
                        <span
                          key={p.id}
                          title={`${p.name} · ${p.type}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs"
                        >
                          {p.logo ? (
                            <img
                              src={p.logo}
                              alt={p.name}
                              width={20}
                              height={20}
                              loading="lazy"
                              decoding="async"
                              className="h-5 w-5 rounded-sm object-contain"
                            />
                          ) : (
                            <Film className="h-4 w-4" />
                          )}
                          <span className="font-medium">{p.name}</span>
                          {p.type !== "flatrate" && (
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {p.type === "free" ? "Gratis" : "Con pubblicità"}
                            </Badge>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detailsQuery.isSuccess && providers.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Non ancora disponibile in streaming in Italia.
                  </p>
                )}

                {/* Trailer YouTube (se presente) */}
                {details?.trailerYouTubeKey && (
                  <div>
                    <h4 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <Play className="h-3.5 w-3.5" />
                      Trailer
                    </h4>
                    <div className="aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-muted">
                      <iframe
                        title={`Trailer di ${item.title}`}
                        src={`https://www.youtube-nocookie.com/embed/${details.trailerYouTubeKey}`}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    Cast principale
                  </h4>
                  {detailsQuery.isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  )}
                  {detailsQuery.isError && (
                    <p className="text-xs text-muted-foreground">
                      Cast non disponibile.
                    </p>
                  )}
                  {detailsQuery.isSuccess && cast.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Cast non disponibile su TMDB.
                    </p>
                  )}
                  {detailsQuery.isSuccess && cast.length > 0 && (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cast.slice(0, 6).map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-2 text-xs bg-muted/40 rounded-md p-2 min-w-0"
                        >
                          {c.profile ? (
                            <img
                              src={c.profile}
                              alt={c.name}
                              loading="lazy"
                              decoding="async"
                              width={36}
                              height={36}
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
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {targetLabel}
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
