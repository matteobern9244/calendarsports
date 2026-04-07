import { useMemo } from "react";
import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusCalendar, useSinnerNextEvent, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface UpcomingEvent {
  sport: string;
  title: string;
  subtitle?: string;
  date: string;
  rawDate: string;
  time?: string;
  children?: React.ReactNode;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  const { data: f1Data, isLoading: f1Loading } = useF1NextRace();
  const { data: juveCalendar, isLoading: juveLoading } = useJuventusCalendar(2025);
  const { data: sinnerNext, isLoading: sinnerLoading } = useSinnerNextEvent();
  const { data: motogpNext, isLoading: motogpLoading } = useMotoGPNextEvent();

  const isLoading = f1Loading || juveLoading || sinnerLoading || motogpLoading;

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
          subtitle: `Serie A · Giornata ${nextMatch.matchday || "—"}`,
          rawDate: nextMatch.date,
          date: formatDateIT(nextMatch.date),
          time: timeStr,
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
    <div className="container py-8 sm:py-12">
      <SectionHeader
        title="Prossimi Eventi"
        subtitle="Tutti gli eventi imminenti ordinati per data"
      />

      {isLoading && <LoadingState message="Caricamento prossimi eventi..." />}

      {!isLoading && events.length === 0 && (
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
              status={getEventStatus(ev.rawDate)}
              highlight={idx === 0}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
