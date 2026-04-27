import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Tv2, RefreshCw, CalendarClock, Globe2 } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OfflineFallback from "@/components/common/OfflineFallback";
import ReleaseDetailDialog from "@/components/streaming/ReleaseDetailDialog";
import ReleaseCountdownBadge from "@/components/streaming/ReleaseCountdownBadge";
import {
  STREAMING_FAMILIES,
  STREAMING_PROVIDERS,
  useReleasesByProvider,
  useReleasesItaly,
  useTvByFamily,
  type ReleaseItem,
} from "@/hooks/useStreamingData";
import type {
  StreamingFamilyId,
  StreamingProviderId,
} from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";
import { todayRomeISO, addDaysISO, daysUntilRome } from "@/lib/dateUtils";
import { Progress } from "@/components/ui/progress";
import { useSyncAll } from "@/hooks/useSyncAll";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const CHANNELS_PER_PAGE = 6;
const RELEASES_PER_PAGE = 8;

type RangeId = "7d" | "30d" | "90d";
type KindId = "all" | "movie" | "tv";
type ViewId = "italy" | "provider";
type SortId = "release" | "popularity";

// Le "Nuove uscite" usano TMDB Discover filtrando per primary_release_date
// (film) / first_air_date (serie) e per provider IT. TMDB non espone una data
// di "platform add", quindi finestre da 1-7 giorni sono spesso vuote.
// Default 30 giorni: copre la finestra realistica di novita' indicizzate.
// daysBack = 0 per i range "futuri", >0 per la finestra estesa.
const RANGES: { id: RangeId; label: string; daysBack: number; daysFwd: number }[] = [
  { id: "7d", label: "Prossimi 7 giorni", daysBack: 0, daysFwd: 7 },
  { id: "30d", label: "Prossimi 30 giorni", daysBack: 0, daysFwd: 30 },
  { id: "90d", label: "Finestra estesa", daysBack: 30, daysFwd: 60 },
];

const KINDS: { id: KindId; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "movie", label: "Film" },
  { id: "tv", label: "Serie" },
];

// Selezione minima di generi TMDB più richiesti, label IT.
// L'id segue la mappa ufficiale TMDB (movie + tv condividono molti id base).
const GENRES: { id: number | null; label: string }[] = [
  { id: null, label: "Tutti i generi" },
  { id: 28, label: "Azione" },
  { id: 12, label: "Avventura" },
  { id: 16, label: "Animazione" },
  { id: 35, label: "Commedia" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentario" },
  { id: 18, label: "Drammatico" },
  { id: 10751, label: "Famiglia" },
  { id: 14, label: "Fantasy" },
  { id: 27, label: "Horror" },
  { id: 9648, label: "Mistero" },
  { id: 10749, label: "Romantico" },
  { id: 878, label: "Sci-Fi" },
  { id: 53, label: "Thriller" },
];

function formatHour(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}


function isFamily(value: string | null): value is StreamingFamilyId {
  return !!value && STREAMING_FAMILIES.some((f) => f.id === value);
}

function isProvider(value: string | null): value is StreamingProviderId {
  return !!value && STREAMING_PROVIDERS.some((p) => p.id === value);
}

function isRange(value: string | null): value is RangeId {
  return !!value && RANGES.some((r) => r.id === value);
}

function isKind(value: string | null): value is KindId {
  return !!value && KINDS.some((k) => k.id === value);
}

function isView(value: string | null): value is ViewId {
  return value === "italy" || value === "provider";
}

function isSort(value: string | null): value is SortId {
  return value === "release" || value === "popularity";
}

export default function StreamingPage() {
  const [params, setParams] = useSearchParams();

  const initialTab = params.get("tab") === "releases" ? "releases" : "tv";
  const [tab, setTab] = useState<"tv" | "releases">(initialTab);

  const initialFamily = isFamily(params.get("family"))
    ? (params.get("family") as StreamingFamilyId)
    : "rai";
  const initialProvider = isProvider(params.get("provider"))
    ? (params.get("provider") as StreamingProviderId)
    : "netflix";
  const initialRange = isRange(params.get("range"))
    ? (params.get("range") as RangeId)
    : "7d";
  const initialKind = isKind(params.get("kind"))
    ? (params.get("kind") as KindId)
    : "all";
  const initialPage = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const initialOnlyUpcoming = params.get("upcoming") === "1";
  const initialView: ViewId = isView(params.get("view"))
    ? (params.get("view") as ViewId)
    : "italy";
  const initialSort: SortId = isSort(params.get("sort"))
    ? (params.get("sort") as SortId)
    : "release";
  const initialGenreParam = params.get("genre");
  const initialGenre: number | null =
    initialGenreParam && /^\d+$/.test(initialGenreParam)
      ? parseInt(initialGenreParam, 10)
      : null;
  const initialItalyProvider: StreamingProviderId | "all" = isProvider(
    params.get("itProvider"),
  )
    ? (params.get("itProvider") as StreamingProviderId)
    : "all";

  const [family, setFamily] = useState<StreamingFamilyId>(initialFamily);
  const [provider, setProvider] = useState<StreamingProviderId>(initialProvider);
  const [range, setRange] = useState<RangeId>(initialRange);
  const [kindFilter, setKindFilter] = useState<KindId>(initialKind);
  const [page, setPage] = useState<number>(initialPage);
  const [onlyUpcoming, setOnlyUpcoming] = useState<boolean>(initialOnlyUpcoming);
  const [selected, setSelected] = useState<ReleaseItem | null>(null);
  const [view, setView] = useState<ViewId>(initialView);
  const [sort, setSort] = useState<SortId>(initialSort);
  const [genre, setGenre] = useState<number | null>(initialGenre);
  const [italyProvider, setItalyProvider] = useState<StreamingProviderId | "all">(
    initialItalyProvider,
  );
  const { sync: handleSync, syncing, syncStep, syncProgress, lastSyncAt } = useSyncAll();
  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return null;
    return new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(lastSyncAt);
  }, [lastSyncAt]);

  // Sync URL state
  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (tab === "tv") {
      next.set("family", family);
    } else {
      next.set("view", view);
      if (view === "provider") {
        next.set("provider", provider);
        if (onlyUpcoming) next.set("upcoming", "1");
      } else {
        if (italyProvider !== "all") next.set("itProvider", italyProvider);
        if (sort !== "release") next.set("sort", sort);
        if (genre !== null) next.set("genre", String(genre));
      }
      if (range !== "30d") next.set("range", range);
      if (kindFilter !== "all") next.set("kind", kindFilter);
    }
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [
    tab,
    family,
    provider,
    range,
    kindFilter,
    onlyUpcoming,
    page,
    setParams,
    view,
    italyProvider,
    sort,
    genre,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [family, provider, range, kindFilter, onlyUpcoming, tab, view, italyProvider, sort, genre]);

  const tvQuery = useTvByFamily(family);

  const { dateFrom, dateTo } = useMemo(() => {
    const today = todayRomeISO();
    const cfg = RANGES.find((r) => r.id === range);
    const back = cfg?.daysBack ?? 0;
    const fwd = cfg?.daysFwd ?? 30;
    return {
      dateFrom: addDaysISO(today, -back),
      dateTo: addDaysISO(today, fwd),
    };
  }, [range]);

  const releasesQuery = useReleasesByProvider(provider, dateFrom, dateTo);
  const italyQuery = useReleasesItaly({
    provider: italyProvider,
    kind: kindFilter,
    dateFrom,
    dateTo,
    sort,
    genreId: genre ?? undefined,
  });

  const channels = tvQuery.data?.channels ?? [];
  const channelsPageCount = Math.max(1, Math.ceil(channels.length / CHANNELS_PER_PAGE));
  const visibleChannels = useMemo(
    () =>
      channels.slice(
        (page - 1) * CHANNELS_PER_PAGE,
        page * CHANNELS_PER_PAGE,
      ),
    [channels, page],
  );

  // Sorgente attiva per la vista Releases
  const activeQuery = view === "italy" ? italyQuery : releasesQuery;
  const allItems: ReleaseItem[] =
    view === "italy"
      ? italyQuery.data?.items ?? []
      : releasesQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () => {
      let items = allItems;
      // In vista "italy" il kind è già filtrato lato edge function.
      if (view === "provider" && kindFilter !== "all") {
        items = items.filter((i) => i.type === kindFilter);
      }
      if (onlyUpcoming) {
        items = items.filter((i) => {
          const d = daysUntilRome(i.releaseDate);
          return d !== null && d >= 0;
        });
      }
      return items;
    },
    [allItems, kindFilter, onlyUpcoming, view],
  );
  const itemsPageCount = Math.max(1, Math.ceil(filteredItems.length / RELEASES_PER_PAGE));
  const visibleItems = useMemo(
    () =>
      filteredItems.slice(
        (page - 1) * RELEASES_PER_PAGE,
        page * RELEASES_PER_PAGE,
      ),
    [filteredItems, page],
  );

  const providerLabel =
    releasesQuery.data?.providerLabel ??
    STREAMING_PROVIDERS.find((p) => p.id === provider)?.label ??
    provider;

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="Streaming"
            subtitle="Palinsesto TV serale e nuove uscite della settimana"
          />
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            {syncing && syncStep ? (
              <span
                className="text-xs font-heading uppercase tracking-wider text-muted-foreground animate-pulse"
                aria-live="polite"
              >
                {syncStep}
              </span>
            ) : lastSyncLabel ? (
              <span
                className="text-xs font-heading uppercase tracking-wider text-muted-foreground"
                aria-live="polite"
              >
                Ultimo aggiornamento:{" "}
                <span className="text-foreground/80 font-mono normal-case">{lastSyncLabel}</span>
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="default"
              onClick={handleSync}
              disabled={syncing}
              className="btn-gold gap-2 shrink-0 px-6 h-11 rounded-full text-sm font-heading uppercase tracking-widest font-semibold hover:text-primary-foreground"
            >
              <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizzo..." : "Sincronizza"}
            </Button>
          </div>
          {syncing && (
            <Progress
              value={syncProgress}
              aria-label="Avanzamento sincronizzazione"
              className="h-1.5 w-[240px]"
            />
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "tv" | "releases")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tv" className="gap-2">
            <Tv2 className="h-4 w-4" />
            TV stasera
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Nuove uscite
          </TabsTrigger>
        </TabsList>

        {/* === TAB TV === */}
        <TabsContent value="tv" className="space-y-6">
          <FamilySelector value={family} onChange={setFamily} />

          {tvQuery.isLoading && <LoadingState message="Caricamento palinsesto..." />}
          {tvQuery.isError && (
            <ErrorState
              message="Palinsesto TV non disponibile"
              detail="La nostra fonte dati non risponde in questo momento. Riprova oppure consulta la guida TV ufficiale del fornitore selezionato."
              onRetry={() => tvQuery.refetch()}
            />
          )}
          {tvQuery.isSuccess && channels.length === 0 && (
            <EmptyState message="Nessun canale disponibile per questa famiglia." />
          )}

          {tvQuery.isSuccess && channels.length > 0 && (
            <>
              <Accordion type="multiple" className="space-y-2">
                {visibleChannels.map((ch) => (
                  <AccordionItem
                    key={ch.id}
                    value={ch.id}
                    className="rounded-lg border border-border/60 bg-card px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        {ch.number !== undefined && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {ch.number}
                          </Badge>
                        )}
                        <span className="font-heading text-sm font-semibold tracking-wide uppercase">
                          {ch.name}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {ch.programs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          Palinsesto non ancora disponibile per questo canale.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/40">
                          {ch.programs.map((p, i) => (
                            <li key={i} className="flex gap-3 py-2 text-sm">
                              <span className="font-mono text-primary w-12 shrink-0">
                                {formatHour(p.start)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{p.title}</p>
                                {p.genre && (
                                  <p className="text-xs text-muted-foreground">
                                    {p.genre}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {channelsPageCount > 1 && (
                <PagerNav
                  page={page}
                  pageCount={channelsPageCount}
                  onChange={setPage}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* === TAB RELEASES === */}
        <TabsContent value="releases" className="space-y-5">
          <ProviderSelector value={provider} onChange={setProvider} />

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <Select value={range} onValueChange={(v) => setRange(v as RangeId)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {KINDS.map((k) => (
                <Button
                  key={k.id}
                  size="sm"
                  variant={kindFilter === k.id ? "default" : "outline"}
                  onClick={() => setKindFilter(k.id)}
                  className={cn(
                    "rounded-full font-heading uppercase tracking-wider text-xs",
                    kindFilter === k.id && "shadow-md",
                  )}
                >
                  {k.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant={onlyUpcoming ? "default" : "outline"}
                onClick={() => setOnlyUpcoming((v) => !v)}
                aria-pressed={onlyUpcoming}
                className={cn(
                  "rounded-full font-heading uppercase tracking-wider text-xs gap-1",
                  onlyUpcoming && "shadow-md",
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Solo in arrivo
              </Button>
            </div>
          </div>

          {releasesQuery.isLoading && <LoadingState message="Caricamento uscite..." />}
          {releasesQuery.isError && (
            <ErrorState
              message="Nuove uscite non disponibili"
              detail="Il catalogo TMDB non risponde in questo momento. Riprova oppure consulta direttamente il sito di TMDB per scoprire le ultime uscite."
              onRetry={() => releasesQuery.refetch()}
              externalLink="https://www.themoviedb.org/movie/upcoming"
              externalLabel="Vedi nuove uscite su TMDB"
              ctaHint="Tocca qui per il catalogo TMDB ufficiale"
            />
          )}
          {releasesQuery.isSuccess && !releasesQuery.data?.configured && (
            <EmptyState message="Configura la chiave TMDB_API_KEY per visualizzare le nuove uscite." />
          )}
          {releasesQuery.isSuccess &&
            releasesQuery.data?.configured &&
            filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-3">
                <EmptyState
                  message={`Nessuna uscita catalogata da TMDB per ${providerLabel} nella finestra selezionata. Le uscite si basano sulla data di prima pubblicazione mondiale, non sull'ingresso sulla piattaforma.`}
                />
                {range !== "90d" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRange("90d")}
                    className="rounded-full font-heading uppercase tracking-wider text-xs"
                  >
                    Allarga finestra
                  </Button>
                )}
              </div>
            )}

          {releasesQuery.isSuccess && filteredItems.length > 0 && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {visibleItems.map((item) => (
                  <button
                    key={`${item.type}-${item.tmdbId}`}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border bg-card",
                        "transition-[box-shadow,border-color,transform] duration-300 ease-out",
                        "shadow-[0_2px_10px_-6px_hsl(var(--navy-dark)/0.25)]",
                        "hover:shadow-[0_18px_40px_-18px_hsl(var(--gold)/0.45),0_4px_12px_-6px_hsl(var(--navy-dark)/0.35)]",
                        "border-[hsl(var(--gold))]/20 hover:border-[hsl(var(--gold))]/55",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px z-10 bg-gradient-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                      />
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          width={342}
                          height={513}
                          className="w-full aspect-[2/3] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="font-heading text-sm font-semibold leading-tight line-clamp-2 min-w-0 flex-1">
                            {item.title}
                          </p>
                          <ReleaseCountdownBadge
                            releaseDate={item.releaseDate}
                            className="shrink-0"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {item.type === "movie" ? "Film" : "Serie"}
                          </Badge>
                          {item.voteAverage !== null && item.voteAverage > 0 && (
                            <span className="font-mono">
                              ★ {item.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </button>
                ))}
              </motion.div>

              {itemsPageCount > 1 && (
                <PagerNav
                  page={page}
                  pageCount={itemsPageCount}
                  onChange={setPage}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <ReleaseDetailDialog
        item={selected}
        provider={provider}
        providerLabel={providerLabel}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function FamilySelector({
  value,
  onChange,
}: {
  value: StreamingFamilyId;
  onChange: (v: StreamingFamilyId) => void;
}) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {STREAMING_FAMILIES.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={value === f.id ? "default" : "outline"}
            onClick={() => onChange(f.id)}
            className={cn(
              "rounded-full font-heading uppercase tracking-wider text-xs",
              value === f.id && "shadow-md",
            )}
          >
            {f.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ProviderSelector({
  value,
  onChange,
}: {
  value: StreamingProviderId;
  onChange: (v: StreamingProviderId) => void;
}) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {STREAMING_PROVIDERS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={value === p.id ? "default" : "outline"}
            onClick={() => onChange(p.id)}
            className={cn(
              "rounded-full font-heading uppercase tracking-wider text-xs",
              value === p.id && "shadow-md",
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function PagerNav({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onChange(page - 1);
            }}
            className={cn(page === 1 && "pointer-events-none opacity-50")}
          />
        </PaginationItem>
        {pages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href="#"
              isActive={p === page}
              onClick={(e) => {
                e.preventDefault();
                onChange(p);
              }}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < pageCount) onChange(page + 1);
            }}
            className={cn(
              page === pageCount && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
