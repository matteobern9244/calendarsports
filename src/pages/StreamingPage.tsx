import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Tv2, RefreshCw } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
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
import ReleaseDetailDialog from "@/components/streaming/ReleaseDetailDialog";
import {
  STREAMING_FAMILIES,
  STREAMING_PROVIDERS,
  useReleasesByProvider,
  useTvByFamily,
  type ReleaseItem,
} from "@/hooks/useStreamingData";
import type {
  StreamingFamilyId,
  StreamingProviderId,
} from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";
import { todayRomeISO, addDaysISO } from "@/lib/dateUtils";
import { Progress } from "@/components/ui/progress";
import { useSyncAll } from "@/hooks/useSyncAll";

const CHANNELS_PER_PAGE = 6;
const RELEASES_PER_PAGE = 8;

type RangeId = "7d" | "30d" | "90d";
type KindId = "all" | "movie" | "tv";

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

export default function StreamingPage() {
  const [params, setParams] = useSearchParams();

  const initialTab = params.get("tab") === "releases" ? "releases" : "tv";
  const [tab, setTab] = useState<"tv" | "releases">(initialTab);

  const initialFamily = isFamily(params.get("family"))
    ? (params.get("family") as StreamingFamilyId)
    : "sky-sport";
  const initialProvider = isProvider(params.get("provider"))
    ? (params.get("provider") as StreamingProviderId)
    : "netflix";
  const initialRange = isRange(params.get("range"))
    ? (params.get("range") as RangeId)
    : "1d";
  const initialKind = isKind(params.get("kind"))
    ? (params.get("kind") as KindId)
    : "all";
  const initialPage = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [family, setFamily] = useState<StreamingFamilyId>(initialFamily);
  const [provider, setProvider] = useState<StreamingProviderId>(initialProvider);
  const [range, setRange] = useState<RangeId>(initialRange);
  const [kindFilter, setKindFilter] = useState<KindId>(initialKind);
  const [page, setPage] = useState<number>(initialPage);
  const [selected, setSelected] = useState<ReleaseItem | null>(null);
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
      next.set("provider", provider);
      if (range !== "1d") next.set("range", range);
      if (kindFilter !== "all") next.set("kind", kindFilter);
    }
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [tab, family, provider, range, kindFilter, page, setParams]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [family, provider, range, kindFilter, tab]);

  const tvQuery = useTvByFamily(family);

  const { dateFrom, dateTo } = useMemo(() => {
    const today = todayRomeISO();
    const days = RANGES.find((r) => r.id === range)?.days ?? 0;
    return { dateFrom: today, dateTo: addDaysISO(today, days) };
  }, [range]);

  const releasesQuery = useReleasesByProvider(provider, dateFrom, dateTo);

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

  const allItems = releasesQuery.data?.items ?? [];
  const filteredItems = useMemo(
    () =>
      kindFilter === "all"
        ? allItems
        : allItems.filter((i) => i.type === kindFilter),
    [allItems, kindFilter],
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
        <SectionHeader
          title="Streaming"
          subtitle="Palinsesto TV serale e nuove uscite della settimana"
        />
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
              message="Impossibile caricare il palinsesto."
              onRetry={() => tvQuery.refetch()}
            />
          )}
          {tvQuery.isSuccess && channels.length === 0 && (
            <EmptyState message="Nessun canale disponibile per questa famiglia." />
          )}

          {tvQuery.isSuccess && channels.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground italic">
                Fonte palinsesto: <span className="font-mono">staseraintv.com</span> (scraping pubblico).
                I dati possono variare o non essere disponibili per alcuni canali (es. Sky Sport non e' coperto dalla fonte).
              </p>
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
            </div>
          </div>

          {releasesQuery.isLoading && <LoadingState message="Caricamento uscite..." />}
          {releasesQuery.isError && (
            <ErrorState
              message="Impossibile caricare le uscite."
              onRetry={() => releasesQuery.refetch()}
            />
          )}
          {releasesQuery.isSuccess && !releasesQuery.data?.configured && (
            <EmptyState message="Configura la chiave TMDB_API_KEY per visualizzare le nuove uscite." />
          )}
          {releasesQuery.isSuccess &&
            releasesQuery.data?.configured &&
            filteredItems.length === 0 && (
              <EmptyState
                message={`Nessuna uscita per ${providerLabel} con i filtri selezionati.`}
              />
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
                    className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  >
                    <Card className="overflow-hidden transition-transform group-hover:-translate-y-0.5 group-hover:shadow-lg">
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          className="w-full aspect-[2/3] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent className="p-3 space-y-1">
                        <p className="font-heading text-sm font-semibold leading-tight line-clamp-2">
                          {item.title}
                        </p>
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
                      </CardContent>
                    </Card>
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
