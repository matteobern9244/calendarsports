import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusCalendar, useSinnerNextEvent, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT } from "@/lib/dateUtils";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Tv2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  STREAMING_FAMILIES,
  type TvFamilyPayload,
} from "@/hooks/useStreamingData";
import { streamingApi, type StreamingFamilyId } from "@/lib/api/sportsApi";

interface UpcomingEvent {
  sport: string;
  title: string;
  subtitle?: string;
  date: string;
  rawDate: string;
  time?: string;
  broadcaster?: string;
  children?: React.ReactNode;
}

interface TvHighlight {
  family: StreamingFamilyId;
  channel: string;
  channelNumber?: number;
  time: string;
  startMs: number;
  hourRome: number;
  minuteRome: number;
  title: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

type FilterValue = "all" | StreamingFamilyId;

export default function HomePage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<FilterValue>("all");
  const [tvPage, setTvPage] = useState(0);
  const TV_PAGE_SIZE = 8;
  const { data: f1Data, isLoading: f1Loading } = useF1NextRace();
  const { data: juveCalendar, isLoading: juveLoading } = useJuventusCalendar(2025);
  const { data: sinnerNext, isLoading: sinnerLoading } = useSinnerNextEvent();
  const { data: motogpNext, isLoading: motogpLoading } = useMotoGPNextEvent();

  // Fetch parallelo di tutte le 5 famiglie TV
  const tvQueries = useQueries({
    queries: STREAMING_FAMILIES.map((f) => ({
      queryKey: ["streaming-tv", f.id],
      queryFn: () => streamingApi.getTvByFamily(f.id),
      staleTime: 15 * 60 * 1000,
    })),
  });

  const isLoading = f1Loading || juveLoading || sinnerLoading || motogpLoading;

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
        for (const p of ch.programs) {
          const d = new Date(p.start);
          const hhmm = timeFmt.format(d);
          const [hStr, mStr] = hhmm.split(":");
          rows.push({
            family: fam,
            channel: ch.name,
            channelNumber: ch.number,
            time: hhmm,
            startMs: d.getTime(),
            hourRome: parseInt(hStr, 10),
            minuteRome: parseInt(mStr, 10),
            title: p.title,
          });
        }
      }
    });
    return rows;
  }, [tvQueries]);

  // "Prima fascia serale" italiana: ~20:30 - 22:30 Europe/Rome.
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
    const pool = familyFilter === "all"
      ? allHighlights
      : allHighlights.filter((r) => r.family === familyFilter);

    // Per ogni canale: prendi il primo programma in prima serata
    // (fallback al primo dopo le 19 se nessuno cade nella finestra stretta)
    const byChannel = new Map<string, TvHighlight>();
    for (const h of pool) {
      const key = `${h.family}|${h.channel}`;
      const existing = byChannel.get(key);
      const inWindow = inPrimeWindow(h);
      if (!existing) {
        byChannel.set(key, h);
        continue;
      }
      const existingInWindow = inPrimeWindow(existing);
      if (inWindow && !existingInWindow) byChannel.set(key, h);
      else if (inWindow === existingInWindow && h.startMs < existing.startMs) {
        byChannel.set(key, h);
      }
    }

    return Array.from(byChannel.values())
      .filter(inPrimeWindow)
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      await queryClient.invalidateQueries();
      toast.success("Tutti i dati sono stati aggiornati!");
    } catch {
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const events = useMemo(() => {
    const upcoming: UpcomingEvent[] = [];
    const now = Date.now();

    if (f1Data?.date) {
      upcoming.push({
        sport: "Formula 1",
        title: f1Data.raceName,
        subtitle: `Round ${f1Data.round} · ${f1Data.circuit}`,
        rawDate: f1Data.date,
        date: formatDateIT(f1Data.date),
        time: formatTimeIT(f1Data.time, f1Data.date),
      });
    }

    if (juveCalendar && Array.isArray(juveCalendar)) {
      const nextMatch = [...juveCalendar]
        .filter((m: any) => m.status !== "FullTime" && m.date && new Date(m.date).getTime() > now)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      if (nextMatch) {
        const isHome = nextMatch.homeTeam?.toLowerCase().includes("juventus");
        const opponent = isHome ? nextMatch.awayTeam : nextMatch.homeTeam;
        const timeStr = new Date(nextMatch.date).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Rome",
        });
        upcoming.push({
          sport: "Calcio · Juventus",
          title: `${isHome ? "vs" : "@"} ${opponent}`,
          subtitle: `${nextMatch.competition || 'Serie A'} · ${nextMatch.competition === 'Serie A' ? `Giornata ${nextMatch.matchday || "—"}` : `Turno ${nextMatch.matchday || "—"}`}`,
          rawDate: nextMatch.date,
          date: formatDateIT(nextMatch.date),
          time: timeStr,
          broadcaster: nextMatch.broadcaster || undefined,
        });
      }
    }

    if (sinnerNext?.date) {
      upcoming.push({
        sport: "Tennis · Sinner",
        title: sinnerNext.name,
        subtitle: `${sinnerNext.tier} · ${sinnerNext.surface} · ${sinnerNext.location}`,
        rawDate: sinnerNext.date,
        date: formatDateIT(sinnerNext.date),
      });
    }

    if (motogpNext) {
      const startDate = motogpNext.date_start || motogpNext.date;
      if (startDate) {
        upcoming.push({
          sport: "MotoGP",
          title: motogpNext.name,
          subtitle: `Round ${motogpNext.round} · ${motogpNext.circuit || motogpNext.location}`,
          rawDate: startDate,
          date: formatDateIT(startDate),
        });
      }
    }

    return upcoming.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [f1Data, juveCalendar, sinnerNext, motogpNext]);

  const filteredFamilyLabel = familyFilter !== "all"
    ? familyLabelMap[familyFilter]
    : null;

  return (
    <div className="container py-8 sm:py-12 space-y-10">
      {/* Stasera in TV — quadro reale multi-famiglia con filtri rapidi */}
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
                  Prima serata (20:30–22:30) — RAI · Mediaset · Sky Sport · Sky Cinema · Discovery
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 self-start sm:self-auto gap-2">
              <Link to="/streaming">
                Apri Streaming
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Filtri rapidi: chip scrollabili su mobile, wrap su desktop */}
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible scrollbar-hide">
            <ToggleGroup
              type="single"
              value={familyFilter}
              onValueChange={(v) => v && setFamilyFilter(v as FilterValue)}
              className="inline-flex sm:flex sm:flex-wrap justify-start gap-1.5 min-w-max sm:min-w-0"
            >
              <ToggleGroupItem
                value="all"
                size="sm"
                aria-label="Mostra tutte le famiglie"
                className="h-9 px-3 text-[11px] font-heading uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Tutti
              </ToggleGroupItem>
              {STREAMING_FAMILIES.map((f) => (
                <ToggleGroupItem
                  key={f.id}
                  value={f.id}
                  size="sm"
                  aria-label={`Filtra ${f.label}`}
                  className="h-9 px-3 text-[11px] font-heading uppercase tracking-wider data-[state=on]:bg-primary data-[state=on]:text-primary-foreground whitespace-nowrap"
                >
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {tonightHighlights.length > 0 ? (
            <ul className="divide-y divide-border/40 rounded-md border border-border/40 bg-card/40 max-h-[480px] overflow-y-auto">
              {tonightHighlights.map((row, i) => {
                const prev = tonightHighlights[i - 1];
                const showFamilyDivider = !prev || prev.family !== row.family;
                return (
                  <li
                    key={`${row.family}-${row.channel}-${row.time}-${i}`}
                    className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 text-sm"
                  >
                    {showFamilyDivider && (
                      <span className="hidden sm:inline-flex font-heading text-[9px] uppercase tracking-widest text-primary/70 w-20 shrink-0">
                        {familyLabelMap[row.family]}
                      </span>
                    )}
                    <span className="font-mono text-primary w-11 sm:w-12 shrink-0 text-xs sm:text-sm">
                      {row.time}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] sm:text-[10px] uppercase tracking-wider shrink-0 max-w-[110px] sm:max-w-none truncate"
                    >
                      {row.channel}
                    </Badge>
                    <span className="font-medium truncate min-w-0 text-xs sm:text-sm">
                      {row.title}
                    </span>
                  </li>
                );
              })}
            </ul>
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

      <div className="flex items-center justify-between mb-2">
        <SectionHeader
          title="Prossimi Eventi"
          subtitle="Tutti gli eventi imminenti ordinati per data"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Sincronizza
        </Button>
      </div>

      {(isLoading || syncing) && <LoadingState message="Caricamento prossimi eventi..." />}

      {!isLoading && !syncing && events.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Nessun evento in programma</p>
      )}

      {events.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
          {events.map((ev) => (
            <EventCard
              key={`${ev.sport}-${ev.rawDate}`}
              sport={ev.sport}
              title={ev.title}
              subtitle={ev.subtitle}
              date={ev.date}
              time={ev.time}
              status={undefined}
              highlight={false}
            >
              {ev.broadcaster && (
                <div className="flex flex-wrap gap-1.5">
                  {ev.broadcaster.split('|').map((b) => b.trim()).filter(Boolean).map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className={
                        name.toLowerCase().includes('dazn')
                          ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]/60 text-[10px]'
                          : name.toLowerCase().includes('sky')
                            ? 'bg-sky-900/80 text-sky-100 border-sky-700/60 text-[10px]'
                            : 'text-[10px]'
                      }
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </EventCard>
          ))}
        </motion.div>
      )}
    </div>
  );
}
