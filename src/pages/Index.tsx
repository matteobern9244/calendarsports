import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import {
  useF1NextRace,
  useFootballCalendar,
  useSinnerNextEvent,
  useMotoGPNextEvent,
} from "@/hooks/useSportsData";
import { getCurrentFootballSeason } from "@/lib/currentSeason";
import {
  formatDateIT,
  formatTimeIT,
  formatFootballDateTime,
  getDateTimestamp,
} from "@/lib/dateUtils";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSyncAll } from "@/hooks/useSyncAll";
import { matchSide } from "@/lib/teamMatch";
import TonightTvList from "@/components/home/TonightTvList";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";
import { cn } from "@/lib/utils";
import OfflineFallback from "@/components/common/OfflineFallback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useUserPrefs } from "@/contexts/useUserPrefs";
import { useNowMinute } from "@/hooks/useNow";
import MatchScore from "@/components/common/MatchScore";
import { partitaInEvidenza } from "@/lib/homeNextMatch";
import { matchPhase, matchScore, type FasePartita } from "@/lib/matchPhase";

interface UpcomingEvent {
  sport: string;
  title: string;
  subtitle?: string;
  date: string;
  rawDate: string;
  time?: string;
  broadcaster?: string;
  /** Solo per il calcio: le altre fonti non dichiarano una fase. */
  fase?: FasePartita;
  score?: { home: number; away: number } | null;
  children?: React.ReactNode;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  // La preferenza si legge prima di tutto il resto: da qui in giu' decide
  // quale calendario si chiede, quale cache «Sincronizza» scalda, e di chi e'
  // la prossima partita mostrata.
  const { sections, favoriteTeam } = useUserPrefs();
  const {
    sync: handleSync,
    syncing,
    syncStep,
    syncProgress,
    lastSyncAt,
  } = useSyncAll(favoriteTeam);
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

  const {
    data: f1Data,
    isLoading: f1Loading,
    error: f1Error,
    refetch: f1Refetch,
  } = useF1NextRace();
  const {
    data: footballCalendar,
    isLoading: footballLoading,
    error: footballError,
    refetch: footballRefetch,
  } = useFootballCalendar(favoriteTeam.slug, getCurrentFootballSeason());
  const {
    data: sinnerNext,
    isLoading: sinnerLoading,
    error: sinnerError,
    refetch: sinnerRefetch,
  } = useSinnerNextEvent();
  const {
    data: motogpNext,
    isLoading: motogpLoading,
    error: motogpError,
    refetch: motogpRefetch,
  } = useMotoGPNextEvent();

  const isLoading = f1Loading || footballLoading || sinnerLoading || motogpLoading;

  const now = useNowMinute();

  const events = useMemo(() => {
    const upcoming: UpcomingEvent[] = [];

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

    if (footballCalendar && Array.isArray(footballCalendar)) {
      // La scelta sta in `homeNextMatch`, dove si prova senza montare una
      // pagina che apre una dozzina di query. Prima il predicato pretendeva
      // «comincia nel futuro», e al fischio d'inizio la partita spariva dalla
      // Home proprio nel momento in cui era l'evento del giorno.
      const nextMatch = partitaInEvidenza(footballCalendar, now);
      if (nextMatch) {
        // Le stesse deduzioni della pagina squadra, non una seconda copia:
        // il confronto e' per uguaglianza esatta, e il verso dipende da chi
        // guarda. Il vecchio `includes("juventus")` sbagliava due volte —
        // sulla squadra e sul confronto.
        const { opponent, prefix } = matchSide(nextMatch, favoriteTeam);
        const { date: dateStr, time: timeStr } = formatFootballDateTime(nextMatch.date);
        upcoming.push({
          sport: `Calcio · ${favoriteTeam.name}`,
          title: `${prefix} ${opponent}`,
          subtitle: `${nextMatch.competition || "Serie A"} · ${nextMatch.competition === "Serie A" ? `Giornata ${nextMatch.matchday || "—"}` : `Turno ${nextMatch.matchday || "—"}`}`,
          rawDate: nextMatch.date,
          date: dateStr,
          time: timeStr,
          broadcaster: nextMatch.broadcaster || undefined,
          fase: matchPhase(nextMatch, now).fase,
          score: matchScore(nextMatch, now),
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
      const startDate = motogpNext.date_start;
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

    return upcoming
      .filter((e) => {
        if (e.sport === "Formula 1") return sections.f1;
        if (e.sport === "MotoGP") return sections.motogp;
        if (e.sport === "Tennis · Sinner") return sections.sinner;
        return true;
      })
      .sort((a, b) => getDateTimestamp(a.rawDate) - getDateTimestamp(b.rawDate));
  }, [f1Data, footballCalendar, sinnerNext, motogpNext, now, sections, favoriteTeam]);

  // Fallback offline: nessun dato in cache da nessuna fonte e siamo offline
  if (
    !isOnline &&
    f1Error &&
    !f1Data &&
    footballError &&
    !footballCalendar &&
    sinnerError &&
    !sinnerNext &&
    motogpError &&
    !motogpNext
  ) {
    return (
      <div className="container py-8 sm:py-12">
        <OfflineFallback
          onRetry={() => {
            f1Refetch();
            footballRefetch();
            sinnerRefetch();
            motogpRefetch();
          }}
        />
      </div>
    );
  }

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
              Ultimo aggiornamento:{" "}
              <span className="text-foreground/80 font-mono normal-case">{lastSyncLabel}</span>
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
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2"
        >
          {events.map((ev, idx) => (
            <EventCard
              key={`${ev.sport}-${ev.rawDate}`}
              sport={ev.sport}
              title={ev.title}
              subtitle={ev.subtitle}
              date={ev.date}
              time={ev.time}
              startDate={ev.rawDate}
              status={ev.fase === "in-corso" ? "in_corso" : undefined}
              highlight={idx === 0}
              onRetry={() => {
                f1Refetch();
                footballRefetch();
                sinnerRefetch();
                motogpRefetch();
              }}
            >
              {ev.score && (
                <div className="mb-2">
                  <MatchScore score={ev.score} scala="card" />
                </div>
              )}
              {ev.broadcaster && (
                <div className="flex flex-wrap gap-1.5">
                  {ev.broadcaster
                    .split("|")
                    .map((b) => b.trim())
                    .filter(Boolean)
                    .map((name) => {
                      const { className } = getBroadcasterStyle(name);
                      return (
                        <Badge
                          key={name}
                          variant="outline"
                          className={cn("text-[10px]", className)}
                        >
                          {name}
                        </Badge>
                      );
                    })}
                </div>
              )}
            </EventCard>
          ))}
        </motion.div>
      )}
    </div>
  );
}
