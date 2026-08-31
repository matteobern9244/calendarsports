import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OfflineFallback from "@/components/common/OfflineFallback";
import ReleaseDetailDialog from "@/components/streaming/ReleaseDetailDialog";
import ReleaseCountdownBadge from "@/components/streaming/ReleaseCountdownBadge";
import {
  STREAMING_PROVIDERS,
  useReleasesItaly,
  useTvByFamily,
  type ReleaseItem,
  type TvChannel,
} from "@/hooks/useStreamingData";
import FamilySelector from "@/components/streaming/FamilySelector";
import ItalyProviderFilter from "@/components/streaming/ItalyProviderFilter";
import PagerNav from "@/components/streaming/PagerNav";
import {
  GENRES,
  KINDS,
  RANGES,
  formatHour,
  readFilters,
  writeFilters,
  type KindId,
  type RangeId,
  type SortId,
  type StreamingTab,
} from "@/lib/streamingFilters";
import type { StreamingFamilyId, StreamingProviderId } from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";
import { todayRomeISO, addDaysISO, formatDateIT } from "@/lib/dateUtils";
import { Progress } from "@/components/ui/progress";
import { useSyncAll } from "@/hooks/useSyncAll";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// `?? []` creerebbe un array nuovo a ogni render, invalidando le `useMemo`
// che lo ricevono come dipendenza. Un vuoto condiviso ha identita' stabile.
const NO_CHANNELS: TvChannel[] = [];
const NO_ITEMS: ReleaseItem[] = [];

const CHANNELS_PER_PAGE = 6;
const RELEASES_PER_PAGE = 8;

export default function StreamingPage() {
  const [params, setParams] = useSearchParams();

  // Letto una volta sola, in un inizializzatore pigro: serve a dare il valore
  // di partenza agli stati, e rifarlo a ogni render sarebbe lavoro buttato.
  const [initial] = useState(() => readFilters(params));

  const [tab, setTab] = useState<StreamingTab>(initial.tab);
  const [family, setFamily] = useState<StreamingFamilyId>(initial.family);
  const [range, setRange] = useState<RangeId>(initial.range);
  const [kindFilter, setKindFilter] = useState<KindId>(initial.kind);
  const [page, setPage] = useState<number>(initial.page);
  const [selected, setSelected] = useState<ReleaseItem | null>(null);
  const [sort, setSort] = useState<SortId>(initial.sort);
  const [genre, setGenre] = useState<number | null>(initial.genre);
  const [italyProvider, setItalyProvider] = useState<StreamingProviderId | "all">(
    initial.italyProvider,
  );
  const { sync: handleSync, syncing, syncStep, syncProgress, lastSyncAt } = useSyncAll();
  const { isOnline } = useOnlineStatus();
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
    setParams(
      writeFilters({ tab, family, range, kind: kindFilter, sort, genre, italyProvider, page }),
      { replace: true },
    );
  }, [tab, family, range, kindFilter, page, setParams, italyProvider, sort, genre]);

  // Reset della pagina quando cambiano i filtri.
  //
  // Come effect questo era un bug: gli effect girano anche al mount, quindi la
  // pagina arrivata da `?page=` veniva subito riscritta a 1 e il deep-link
  // andava perso. Confrontando i filtri con quelli del render precedente il
  // reset scatta solo quando cambiano davvero. E' il pattern React di
  // "aggiustare lo stato quando cambiano le props": React riesegue subito il
  // render senza mostrare quello intermedio.
  const filtersKey = [family, range, kindFilter, tab, italyProvider, sort, genre].join("|");
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

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

  const italyQuery = useReleasesItaly({
    provider: italyProvider,
    kind: kindFilter,
    dateFrom,
    dateTo,
    sort,
    genreId: genre ?? undefined,
  });

  const channels = tvQuery.data?.channels ?? NO_CHANNELS;
  const channelsPageCount = Math.max(1, Math.ceil(channels.length / CHANNELS_PER_PAGE));
  const visibleChannels = useMemo(
    () => channels.slice((page - 1) * CHANNELS_PER_PAGE, page * CHANNELS_PER_PAGE),
    [channels, page],
  );

  // Sorgente unica: Catalogo Italia (filtri server-side).
  const activeQuery = italyQuery;
  const filteredItems: ReleaseItem[] = italyQuery.data?.items ?? NO_ITEMS;
  const itemsPageCount = Math.max(1, Math.ceil(filteredItems.length / RELEASES_PER_PAGE));
  const visibleItems = useMemo(
    () => filteredItems.slice((page - 1) * RELEASES_PER_PAGE, page * RELEASES_PER_PAGE),
    [filteredItems, page],
  );

  const providerLabel =
    italyProvider !== "all"
      ? (STREAMING_PROVIDERS.find((p) => p.id === italyProvider)?.label ?? italyProvider)
      : "Italia";

  const widened = italyQuery.data?.widenedWindow === true;
  const fallbackRecent = italyQuery.data?.fallbackRecent === true;
  const effectiveFrom = italyQuery.data?.effectiveFrom;
  const effectiveTo = italyQuery.data?.effectiveTo;

  const activeRangeLabel = RANGES.find((r) => r.id === range)?.label ?? "";
  const activeKindLabel = KINDS.find((k) => k.id === kindFilter)?.label ?? "";
  const activeGenreLabel = GENRES.find((g) => g.id === genre)?.label ?? "Tutti i generi";
  const activeSortLabel = sort === "popularity" ? "Popolarità" : "Data uscita";

  // Stesso comportamento delle pagine sport: se siamo offline e non c'e'
  // nulla in cache da nessuna delle due fonti, si mostra il fallback invece
  // di una pagina vuota. I componenti erano gia' importati qui ma non erano
  // mai stati collegati.
  if (!isOnline && tvQuery.error && !tvQuery.data && italyQuery.error && !italyQuery.data) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback
          onRetry={() => {
            tvQuery.refetch();
            italyQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="Streaming"
            subtitle="Palinsesto TV serale e nuove uscite in Italia"
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
                                  <p className="text-xs text-muted-foreground">{p.genre}</p>
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
                <PagerNav page={page} pageCount={channelsPageCount} onChange={setPage} />
              )}
            </>
          )}
        </TabsContent>

        {/* === TAB RELEASES === */}
        <TabsContent value="releases" className="space-y-5">
          {/* Catalogo Italia: vista unica. Filtro provider IT opzionale. */}
          <ItalyProviderFilter value={italyProvider} onChange={setItalyProvider} />

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

            <Select
              value={genre === null ? "all" : String(genre)}
              onValueChange={(v) => setGenre(v === "all" ? null : parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem
                    key={String(g.id ?? "all")}
                    value={g.id === null ? "all" : String(g.id)}
                  >
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortId)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="release">Ordina per data uscita</SelectItem>
                <SelectItem value="popularity">Ordina per popolarità</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {KINDS.map((k) => (
                <Button
                  key={k.id}
                  size="sm"
                  variant={kindFilter === k.id ? "default" : "outline"}
                  // La selezione era comunicata dal solo colore del bottone:
                  // `aria-pressed` la dichiara anche a chi non lo vede.
                  aria-pressed={kindFilter === k.id}
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

          {fallbackRecent && filteredItems.length > 0 && (
            <p className="text-xs text-muted-foreground italic" aria-live="polite">
              Nessuna uscita {providerLabel !== "Italia" ? `su ${providerLabel} ` : ""}nella
              finestra selezionata: stiamo mostrando le uscite più recenti.
            </p>
          )}

          {!fallbackRecent &&
            widened &&
            effectiveFrom &&
            effectiveTo &&
            filteredItems.length > 0 && (
              <p className="text-xs text-muted-foreground italic" aria-live="polite">
                Nessun titolo nella finestra selezionata: stiamo mostrando le uscite tra{" "}
                {formatDateIT(effectiveFrom)} e {formatDateIT(effectiveTo)}.
              </p>
            )}

          {activeQuery.isSuccess && activeQuery.data?.configured && (
            <div
              className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
              aria-live="polite"
            >
              <Badge variant="secondary" className="font-normal">
                Provider:{" "}
                <span className="ml-1 font-semibold text-foreground">{providerLabel}</span>
              </Badge>
              <Badge variant="secondary" className="font-normal">
                Tipo: <span className="ml-1 font-semibold text-foreground">{activeKindLabel}</span>
              </Badge>
              <Badge variant="secondary" className="font-normal">
                Genere:{" "}
                <span className="ml-1 font-semibold text-foreground">{activeGenreLabel}</span>
              </Badge>
              <Badge variant="secondary" className="font-normal">
                Ordina:{" "}
                <span className="ml-1 font-semibold text-foreground">{activeSortLabel}</span>
              </Badge>
              <Badge variant="secondary" className="font-normal">
                Finestra:{" "}
                <span className="ml-1 font-semibold text-foreground">
                  {activeRangeLabel}
                  {(widened || fallbackRecent) && effectiveFrom && effectiveTo
                    ? ` (effettiva ${formatDateIT(effectiveFrom)} – ${formatDateIT(effectiveTo)})`
                    : ""}
                </span>
              </Badge>
              <Badge variant="outline" className="font-mono">
                {filteredItems.length} titoli
              </Badge>
            </div>
          )}

          {activeQuery.isLoading && <LoadingState message="Caricamento uscite..." />}
          {activeQuery.isError && (
            <ErrorState
              message="Nuove uscite non disponibili"
              detail="Il catalogo TMDB non risponde in questo momento. Riprova oppure consulta direttamente il sito di TMDB per scoprire le ultime uscite."
              onRetry={() => activeQuery.refetch()}
              externalLink="https://www.themoviedb.org/movie/upcoming"
              externalLabel="Vedi nuove uscite su TMDB"
              ctaHint="Tocca qui per il catalogo TMDB ufficiale"
            />
          )}
          {activeQuery.isSuccess && !activeQuery.data?.configured && (
            <EmptyState message="Configura la chiave TMDB_API_KEY per visualizzare le nuove uscite." />
          )}
          {activeQuery.isSuccess && activeQuery.data?.configured && filteredItems.length === 0 && (
            <div className="flex flex-col items-center gap-3">
              <EmptyState message="Nessun titolo trovato in Italia per i filtri selezionati. Allarga la finestra o cambia genere." />
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

          {activeQuery.isSuccess && filteredItems.length > 0 && (
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
                    className="text-left group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
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
                        className="pointer-events-none absolute inset-x-0 top-0 h-px z-10 bg-linear-to-r from-transparent via-[hsl(var(--gold))]/70 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                      />
                      {item.poster ? (
                        <img
                          src={item.poster}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          width={342}
                          height={513}
                          className="w-full aspect-2/3 object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-2/3 bg-muted flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="font-heading text-sm font-semibold leading-tight line-clamp-2 min-w-0 flex-1">
                            {item.title}
                          </p>
                          <ReleaseCountdownBadge
                            releaseDate={item.releaseDate}
                            className="shrink-0"
                          />
                        </div>
                        {item.genres && item.genres.length > 0 && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.genres.slice(0, 3).join(" · ")}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {item.type === "movie" ? "Film" : "Serie"}
                            {item.year ? ` · ${item.year}` : ""}
                          </Badge>
                          {item.voteAverage !== null && item.voteAverage > 0 && (
                            <span className="font-mono">★ {item.voteAverage.toFixed(1)}</span>
                          )}
                        </div>
                        {item.availableProviders && item.availableProviders.length > 0 && (
                          <div className="flex items-center gap-1 pt-0.5">
                            {item.availableProviders.slice(0, 3).map((p) => (
                              <span
                                key={p.id}
                                title={p.name}
                                className="inline-flex h-5 w-5 rounded-sm overflow-hidden bg-muted border border-border/40"
                              >
                                {p.logo ? (
                                  <img
                                    src={p.logo}
                                    alt={p.name}
                                    width={20}
                                    height={20}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-contain"
                                  />
                                ) : null}
                              </span>
                            ))}
                            {item.availableProviders.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{item.availableProviders.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </button>
                ))}
              </motion.div>

              {itemsPageCount > 1 && (
                <PagerNav page={page} pageCount={itemsPageCount} onChange={setPage} />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <ReleaseDetailDialog
        item={selected}
        provider={italyProvider !== "all" ? italyProvider : "netflix"}
        providerLabel={providerLabel}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
