import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusCalendar, useSinnerNextEvent, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Tv2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { STREAMING_FAMILIES, useTvByFamily } from "@/hooks/useStreamingData";

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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { data: f1Data, isLoading: f1Loading } = useF1NextRace();
  const { data: juveCalendar, isLoading: juveLoading } = useJuventusCalendar(2025);
  const { data: sinnerNext, isLoading: sinnerLoading } = useSinnerNextEvent();
  const { data: motogpNext, isLoading: motogpLoading } = useMotoGPNextEvent();
  const { data: tvDiscovery } = useTvByFamily("discovery");

  const isLoading = f1Loading || juveLoading || sinnerLoading || motogpLoading;

  const tonightHighlights = useMemo(() => {
    if (!tvDiscovery?.programsAvailable) return [];
    const rows: { channel: string; time: string; title: string }[] = [];
    for (const ch of tvDiscovery.channels ?? []) {
      for (const p of ch.programs) {
        rows.push({
          channel: ch.name,
          time: new Intl.DateTimeFormat("it-IT", {
            timeZone: "Europe/Rome",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(p.start)),
          title: p.title,
        });
      }
    }
    return rows
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 6);
  }, [tvDiscovery]);

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

    // F1
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

    // Juventus — prossima partita dal calendario
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

    // Sinner
    if (sinnerNext?.date) {
      upcoming.push({
        sport: "Tennis · Sinner",
        title: sinnerNext.name,
        subtitle: `${sinnerNext.tier} · ${sinnerNext.surface} · ${sinnerNext.location}`,
        rawDate: sinnerNext.date,
        date: formatDateIT(sinnerNext.date),
      });
    }

    // MotoGP
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

    // Ordina per data più vicina
    return upcoming.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  }, [f1Data, juveCalendar, sinnerNext, motogpNext]);

  return (
    <div className="container py-8 sm:py-12 space-y-10">
      {/* Stasera in TV — quadro rapido programmi reali (Discovery) + link */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-card/60">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gold-gradient shrink-0">
                <Tv2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
                  <span className="text-gold-gradient">Stasera in TV</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {tonightHighlights.length > 0
                    ? "Prime time Real Time + DMax (palinsesto reale)"
                    : "Palinsesto serale + nuove uscite streaming"}
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

          {tonightHighlights.length > 0 ? (
            <ul className="divide-y divide-border/40 rounded-md border border-border/40 bg-card/40">
              {tonightHighlights.map((row, i) => (
                <li
                  key={`${row.channel}-${row.time}-${i}`}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-primary w-12 shrink-0">
                    {row.time}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                    {row.channel}
                  </Badge>
                  <span className="font-medium truncate min-w-0">{row.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {STREAMING_FAMILIES.map((f) => (
                <Link
                  key={f.id}
                  to={`/streaming?tab=tv&family=${f.id}`}
                  className="text-[10px] font-heading uppercase tracking-wider px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                >
                  {f.label}
                </Link>
              ))}
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
          {events.map((ev, idx) => (
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
