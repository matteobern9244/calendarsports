import { Fragment, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  LayoutGrid,
  Radio,
  Trophy,
  Tv,
  Tv2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  STREAMING_FAMILIES,
  type TvFamilyPayload,
} from "@/hooks/useStreamingData";
import { streamingApi, type StreamingFamilyId } from "@/lib/api/sportsApi";
import { formatDuration } from "@/lib/dateUtils";
import { inferGenre } from "@/lib/genreUtils";

// Pittogrammi per famiglia: scelti per evocare l'identita' del broadcaster
// senza dipendere da loghi proprietari (Radio = RAI servizio pubblico,
// Tv = Mediaset generalista, Trophy = Sky Sport, Film = Sky Cinema,
// Compass = Discovery / esplorazione).
const FAMILY_ICONS: Record<StreamingFamilyId, LucideIcon> = {
  rai: Radio,
  mediaset: Tv,
  "sky-sport": Trophy,
  "sky-cinema": Film,
  discovery: Compass,
};

interface TvHighlight {
  family: StreamingFamilyId;
  channel: string;
  channelNumber?: number;
  time: string;
  startMs: number;
  durationMin: number;
  hourRome: number;
  minuteRome: number;
  title: string;
  genre?: string;
}

type FilterValue = "all" | StreamingFamilyId;

const TV_PAGE_SIZE = 8;

/**
 * Scheda "Stasera in TV" della Home: aggrega i palinsesti delle 5 famiglie
 * (RAI, Mediaset, Sky Sport, Sky Cinema, Discovery), filtra per prima serata
 * e mostra il programma principale per canale con filtri rapidi e
 * paginazione interna. Tutta la logica e' incapsulata qui per non far
 * crescere ulteriormente Index.tsx.
 */
export default function TonightTvList() {
  const [familyFilter, setFamilyFilter] = useState<FilterValue>("all");
  const [tvPage, setTvPage] = useState(0);

  // Fetch parallelo di tutte le 5 famiglie TV
  const tvQueries = useQueries({
    queries: STREAMING_FAMILIES.map((f) => ({
      queryKey: ["streaming-tv", f.id],
      queryFn: () => streamingApi.getTvByFamily(f.id),
      staleTime: 15 * 60 * 1000,
    })),
  });

  // Aggrega tutti i programmi reali da tutte le famiglie con etichetta family
  const allHighlights = useMemo<TvHighlight[]>(() => {
    const rows: TvHighlight[] = [];
    const timeFmt = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    tvQueries.forEach((q, idx) => {
      const fam = STREAMING_FAMILIES[idx].id;
      const data = q.data as TvFamilyPayload | undefined;
      if (!data?.programsAvailable) return;
      for (const ch of data.channels ?? []) {
        // In home limitiamo le famiglie ai canali principali per non
        // saturare la scheda Stasera in TV.
        if (fam === "rai" && ch.id !== "rai-1" && ch.id !== "rai-2") continue;
        if (fam === "mediaset" && ch.id !== "canale-5" && ch.id !== "italia-1") continue;
        for (const p of ch.programs) {
          const d = new Date(p.start);
          const hhmm = timeFmt.format(d);
          const [hStr, mStr] = hhmm.split(":");
          const endMs = p.end ? new Date(p.end).getTime() : d.getTime() + 30 * 60 * 1000;
          const durationMin = Math.max(0, Math.round((endMs - d.getTime()) / 60000));
          rows.push({
            family: fam,
            channel: ch.name,
            channelNumber: ch.number,
            time: hhmm,
            startMs: d.getTime(),
            durationMin,
            hourRome: parseInt(hStr, 10),
            minuteRome: parseInt(mStr, 10),
            title: p.title,
            genre: p.genre,
          });
        }
      }
    });
    return rows;
  }, [tvQueries]);

  // "Prima fascia serale" italiana: ~21:00 - 22:30 Europe/Rome.
  // Selezioniamo per ogni canale il primo programma in quella finestra,
  // poi ordiniamo per famiglia (RAI -> Mediaset -> Sky Sport -> Sky Cinema
  // -> Discovery) e per numero canale.
  const familyOrder = useMemo(() => {
    const m: Record<StreamingFamilyId, number> = {} as Record<StreamingFamilyId, number>;
    STREAMING_FAMILIES.forEach((f, i) => { m[f.id] = i; });
    return m;
  }, []);

  const tonightHighlights = useMemo(() => {
    const inPrimeWindow = (h: TvHighlight) => {
      const minutes = h.hourRome * 60 + h.minuteRome;
      return minutes >= 21 * 60 && minutes <= 22 * 60 + 30;
    };
    // Considera "vero" programma di prima serata solo se dura almeno 20 min:
    // evita stacchi pubblicitari, sigle, R-TNOV e simili "filler" da 1-2 min.
    const MIN_DURATION = 20;
    const isMainProgram = (h: TvHighlight) => h.durationMin >= MIN_DURATION;

    const pool = familyFilter === "all"
      ? allHighlights
      : allHighlights.filter((r) => r.family === familyFilter);

    // Per ogni canale: preferisci il primo programma "vero" (>=20 min) in
    // prima serata. Fallback al primo qualsiasi se nessun main program.
    const byChannel = new Map<string, TvHighlight>();
    for (const h of pool) {
      if (!inPrimeWindow(h)) continue;
      const key = `${h.family}|${h.channel}`;
      const existing = byChannel.get(key);
      if (!existing) {
        byChannel.set(key, h);
        continue;
      }
      const hMain = isMainProgram(h);
      const existingMain = isMainProgram(existing);
      if (hMain && !existingMain) byChannel.set(key, h);
      else if (hMain === existingMain && h.startMs < existing.startMs) {
        byChannel.set(key, h);
      }
    }

    return Array.from(byChannel.values())
      .sort((a, b) => {
        const fa = familyOrder[a.family] - familyOrder[b.family];
        if (fa !== 0) return fa;
        const cn = (a.channelNumber ?? 9999) - (b.channelNumber ?? 9999);
        if (cn !== 0) return cn;
        return a.startMs - b.startMs;
      });
  }, [allHighlights, familyFilter, familyOrder]);

  const familyLabelMap = useMemo(() => {
    const m: Record<StreamingFamilyId, string> = {} as Record<StreamingFamilyId, string>;
    STREAMING_FAMILIES.forEach((f) => { m[f.id] = f.label; });
    return m;
  }, []);

  const filteredFamilyLabel = familyFilter !== "all"
    ? familyLabelMap[familyFilter]
    : null;

  // Reset paginazione quando cambia il filtro famiglia
  useEffect(() => {
    setTvPage(0);
  }, [familyFilter]);

  const totalTvPages = Math.max(1, Math.ceil(tonightHighlights.length / TV_PAGE_SIZE));
  const safePage = Math.min(tvPage, totalTvPages - 1);
  const pagedHighlights = useMemo(
    () => tonightHighlights.slice(safePage * TV_PAGE_SIZE, safePage * TV_PAGE_SIZE + TV_PAGE_SIZE),
    [tonightHighlights, safePage],
  );

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-card/60">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient shrink-0">
              <Tv2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
                <span className="text-gold-gradient">Stasera in TV</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Prima serata (dalle 21:00) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery
              </p>
            </div>
          </div>
        </div>

        {/* Filtri rapidi: griglia 3 colonne su mobile (2 righe), wrap libero su desktop.
            Niente scroll orizzontale: tutte le 6 chip devono essere sempre visibili. */}
        <ToggleGroup
          type="single"
          value={familyFilter}
          onValueChange={(v) => v && setFamilyFilter(v as FilterValue)}
          className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-start"
        >
          <ToggleGroupItem
            value="all"
            size="sm"
            aria-label="Mostra tutte le famiglie"
            className="h-9 w-full sm:w-auto px-2 sm:px-3 text-[11px] font-heading uppercase tracking-wider border border-primary/30 bg-card/60 text-foreground hover:bg-primary/15 hover:text-foreground hover:border-primary/60 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-[0_0_0_1px_hsl(var(--gold)/0.6)] gap-1.5"
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Tutti
          </ToggleGroupItem>
          {STREAMING_FAMILIES.map((f) => {
            const FamilyIcon = FAMILY_ICONS[f.id];
            return (
              <ToggleGroupItem
                key={f.id}
                value={f.id}
                size="sm"
                aria-label={`Filtra ${f.label}`}
                className="h-9 w-full sm:w-auto px-2 sm:px-3 text-[11px] font-heading uppercase tracking-wider whitespace-nowrap border border-primary/30 bg-card/60 text-foreground hover:bg-primary/15 hover:text-foreground hover:border-primary/60 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary data-[state=on]:shadow-[0_0_0_1px_hsl(var(--gold)/0.6)] gap-1.5"
              >
                <FamilyIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {f.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        {tonightHighlights.length > 0 ? (
          <>
            <ul className="divide-y divide-border/40 rounded-md border border-border/40 bg-card/40 overflow-hidden">
              {pagedHighlights.map((row, i) => {
                const prev = pagedHighlights[i - 1];
                const showFamilyDivider = !prev || prev.family !== row.family;
                return (
                  <Fragment key={`${row.family}-${row.channel}-${row.time}-${i}`}>
                    {showFamilyDivider && i > 0 && (
                      <li
                        aria-hidden="true"
                        data-testid="family-divider"
                        data-family={row.family}
                        className="h-[3px] bg-primary border-y border-primary/40 list-none"
                      />
                    )}
                    {showFamilyDivider && (() => {
                      const FamilyIcon = FAMILY_ICONS[row.family];
                      return (
                        <li
                          data-testid="family-label-mobile"
                          data-family={row.family}
                          className="sm:hidden flex items-center gap-1.5 px-2.5 pt-2 pb-1 bg-primary/5"
                        >
                          <FamilyIcon className="h-3.5 w-3.5 text-primary/80 shrink-0" aria-hidden="true" />
                          <span className="font-heading font-bold text-[10px] uppercase tracking-widest text-primary/80">
                            {familyLabelMap[row.family]}
                          </span>
                        </li>
                      );
                    })()}
                    <li className="px-2.5 sm:px-3 py-2.5 sm:py-2 text-sm">
                      {/* Desktop: layout su singola riga */}
                      <div className="hidden sm:flex sm:items-center sm:gap-3">
                        {(() => {
                          const FamilyIcon = FAMILY_ICONS[row.family];
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 font-heading font-bold text-xs uppercase tracking-wider w-24 shrink-0 ${
                                showFamilyDivider ? "text-primary/80" : "text-transparent"
                              }`}
                              aria-hidden={!showFamilyDivider}
                            >
                              <FamilyIcon
                                className={`h-3.5 w-3.5 shrink-0 ${showFamilyDivider ? "text-primary/80" : "text-transparent"}`}
                                aria-hidden="true"
                              />
                              {familyLabelMap[row.family]}
                            </span>
                          );
                        })()}
                        <span className="font-mono font-bold text-primary w-12 shrink-0 text-sm leading-none">
                          {row.time}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap leading-none"
                        >
                          {row.channel}
                        </Badge>
                        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-sm leading-tight break-words">
                            {row.title}
                          </span>
                          {(() => {
                            const g = row.genre || inferGenre(row.family, row.channel, row.title);
                            return g ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] uppercase tracking-wider shrink-0 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 leading-none"
                              >
                                {g}
                              </Badge>
                            ) : null;
                          })()}
                          {formatDuration(row.durationMin) && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap font-mono leading-none">
                              {formatDuration(row.durationMin)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile: layout a 2 righe per migliore leggibilita' */}
                      <div className="sm:hidden flex flex-col gap-1.5">
                        {/* Riga 1: ora + canale + durata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-primary text-sm leading-none shrink-0">
                            {row.time}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap leading-none"
                          >
                            {row.channel}
                          </Badge>
                          {formatDuration(row.durationMin) && (
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap font-mono leading-none ml-auto">
                              {formatDuration(row.durationMin)}
                            </span>
                          )}
                        </div>
                        {/* Riga 2: titolo + genere */}
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="font-medium text-[13px] leading-snug break-words flex-1 min-w-0">
                            {row.title}
                          </span>
                          {(() => {
                            const g = row.genre || inferGenre(row.family, row.channel, row.title);
                            return g ? (
                              <Badge
                                variant="secondary"
                                className="text-[9px] uppercase tracking-wider shrink-0 bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 leading-none mt-0.5"
                              >
                                {g}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </li>
                  </Fragment>
                );
              })}
            </ul>

            {totalTvPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTvPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-8 px-2 gap-1 text-xs"
                  aria-label="Pagina precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Precedente</span>
                </Button>
                <span className="text-[11px] font-heading uppercase tracking-wider text-muted-foreground">
                  Pagina {safePage + 1} / {totalTvPages} · {tonightHighlights.length} canali
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTvPage((p) => Math.min(totalTvPages - 1, p + 1))}
                  disabled={safePage >= totalTvPages - 1}
                  className="h-8 px-2 gap-1 text-xs"
                  aria-label="Pagina successiva"
                >
                  <span className="hidden sm:inline">Successiva</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
            {filteredFamilyLabel ? (
              <>
                Palinsesto non disponibile per <strong>{filteredFamilyLabel}</strong>.
                <br />
                <button
                  type="button"
                  onClick={() => setFamilyFilter("all")}
                  className="mt-2 text-primary hover:underline text-xs font-heading uppercase tracking-wider"
                >
                  Mostra tutte le famiglie
                </button>
              </>
            ) : (
              "Palinsesto non ancora disponibile"
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
