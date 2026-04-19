import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Tv2 } from "lucide-react";
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
import {
  STREAMING_FAMILIES,
  STREAMING_PROVIDERS,
  useReleasesByProvider,
  useTvByFamily,
} from "@/hooks/useStreamingData";
import type {
  StreamingFamilyId,
  StreamingProviderId,
} from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";

const CHANNELS_PER_PAGE = 6;
const RELEASES_PER_PAGE = 8;

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
  const initialPage = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [family, setFamily] = useState<StreamingFamilyId>(initialFamily);
  const [provider, setProvider] = useState<StreamingProviderId>(initialProvider);
  const [page, setPage] = useState<number>(initialPage);

  // Sync URL state
  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", tab);
    if (tab === "tv") next.set("family", family);
    else next.set("provider", provider);
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [tab, family, provider, page, setParams]);

  // Reset page when switching family/provider/tab
  useEffect(() => {
    setPage(1);
  }, [family, provider, tab]);

  const tvQuery = useTvByFamily(family);
  const releasesQuery = useReleasesByProvider(provider);

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

  const items = releasesQuery.data?.items ?? [];
  const itemsPageCount = Math.max(1, Math.ceil(items.length / RELEASES_PER_PAGE));
  const visibleItems = useMemo(
    () =>
      items.slice(
        (page - 1) * RELEASES_PER_PAGE,
        page * RELEASES_PER_PAGE,
      ),
    [items, page],
  );

  return (
    <div className="container py-8 space-y-8">
      <SectionHeader
        title="Streaming"
        subtitle="Palinsesto TV serale e nuove uscite del giorno"
      />

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
              {!tvQuery.data?.programsAvailable && (
                <p className="text-xs text-muted-foreground italic">
                  Palinsesto in fase di integrazione: i canali sono elencati,
                  i programmi reali verranno aggiunti al rilascio dei feed.
                </p>
              )}
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
        <TabsContent value="releases" className="space-y-6">
          <ProviderSelector value={provider} onChange={setProvider} />

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
            items.length === 0 && (
              <EmptyState
                message={`Nessuna uscita oggi su ${releasesQuery.data.providerLabel}.`}
              />
            )}

          {releasesQuery.isSuccess && items.length > 0 && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {visibleItems.map((item) => (
                  <Card key={`${item.type}-${item.tmdbId}`} className="overflow-hidden">
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
