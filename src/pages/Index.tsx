import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusCalendar, useSinnerNextEvent, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT } from "@/lib/dateUtils";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSyncAll } from "@/hooks/useSyncAll";
import TonightTvList from "@/components/home/TonightTvList";

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

  const { data: f1Data, isLoading: f1Loading } = useF1NextRace();
  const { data: juveCalendar, isLoading: juveLoading } = useJuventusCalendar(2025);
  const { data: sinnerNext, isLoading: sinnerLoading } = useSinnerNextEvent();
  const { data: motogpNext, isLoading: motogpLoading } = useMotoGPNextEvent();

  const isLoading = f1Loading || juveLoading || sinnerLoading || motogpLoading;

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

  return (
    <div className="container py-4 sm:py-6 space-y-8">
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center justify-end gap-3">
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
              Ultimo aggiornamento: <span className="text-foreground/80 font-mono normal-case">{lastSyncLabel}</span>
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="default"
            onClick={handleSync}
            disabled={syncing || isLoading}
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

      {/* Stasera in TV — quadro reale multi-famiglia con filtri rapidi */}
      <TonightTvList />

      <div className="mb-2">
        <SectionHeader
          title="Prossimi Eventi"
          subtitle="Tutti gli eventi imminenti ordinati per data"
        />
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
