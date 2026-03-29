import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusNextMatch, useSinnerNextEvents, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function F1NextCard() {
  const { data, isLoading, error, refetch } = useF1NextRace();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-48" />;
  if (error || !data) return (
    <EventCard sport="Formula 1" title="Prossimo GP" date="—" status="prossimo">
      <p className="text-xs text-destructive">Dati non disponibili</p>
    </EventCard>
  );

  return (
    <EventCard
      sport="Formula 1"
      title={data.raceName}
      subtitle={`Round ${data.round} · ${data.circuit}`}
      date={formatDateIT(data.date)}
      time={formatTimeIT(data.time, data.date)}
      status={getEventStatus(data.date)}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Sessioni del weekend:</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          {data.firstPractice && (
            <span>PL1: {formatDateIT(data.firstPractice.date).split(' ').slice(0,2).join(' ')} {formatTimeIT(data.firstPractice.time, data.firstPractice.date)}</span>
          )}
          {data.secondPractice && (
            <span>PL2: {formatDateIT(data.secondPractice.date).split(' ').slice(0,2).join(' ')} {formatTimeIT(data.secondPractice.time, data.secondPractice.date)}</span>
          )}
          {data.thirdPractice && (
            <span>PL3: {formatDateIT(data.thirdPractice.date).split(' ').slice(0,2).join(' ')} {formatTimeIT(data.thirdPractice.time, data.thirdPractice.date)}</span>
          )}
          {data.sprint && (
            <span>Sprint: {formatDateIT(data.sprint.date).split(' ').slice(0,2).join(' ')} {formatTimeIT(data.sprint.time, data.sprint.date)}</span>
          )}
          {data.qualifying && (
            <span>Qualifiche: {formatDateIT(data.qualifying.date).split(' ').slice(0,2).join(' ')} {formatTimeIT(data.qualifying.time, data.qualifying.date)}</span>
          )}
          <span className="col-span-2 font-semibold text-primary">
            Gara: {formatDateIT(data.date)} {formatTimeIT(data.time, data.date)}
          </span>
        </div>
      </div>
    </EventCard>
  );
}

function JuventusNextCard() {
  const { data, isLoading, error } = useJuventusNextMatch();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data || data.length === 0) return (
    <EventCard sport="Calcio · Juventus" title="Prossima partita" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">
        {error ? "Configura la chiave API football-data.org per dati reali" : "Nessun match programmato"}
      </p>
    </EventCard>
  );

  const match = data[0];
  return (
    <EventCard
      sport={`Calcio · ${match.competition}`}
      title={`${match.homeTeam} vs ${match.awayTeam}`}
      subtitle={match.matchday ? `Giornata ${match.matchday}` : undefined}
      date={formatDateIT(match.date)}
      time={formatTimeIT(match.date?.split('T')[1], match.date?.split('T')[0])}
      status="prossimo"
    >
      {match.venue && <p className="text-xs text-muted-foreground">{match.venue}</p>}
    </EventCard>
  );
}

function SinnerNextCard() {
  const { data, isLoading, error } = useSinnerNextEvents();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data || data.length === 0) return (
    <EventCard sport="Tennis · Jannik Sinner" title="Prossimo match" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">Nessun match programmato al momento</p>
    </EventCard>
  );

  const event = data[0];
  return (
    <EventCard
      sport={`Tennis · ${event.league || "ATP"}`}
      title={event.name}
      subtitle={event.round ? `Round ${event.round}` : undefined}
      date={formatDateIT(event.date)}
      time={event.time ? formatTimeIT(event.time, event.date) : undefined}
      status="prossimo"
    />
  );
}

function MotoGPNextCard() {
  const { data, isLoading, error } = useMotoGPNextEvent();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data || data.length === 0) return (
    <EventCard sport="MotoGP" title="Prossimo GP" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">Nessun evento programmato al momento</p>
    </EventCard>
  );

  const event = data[0];
  return (
    <EventCard
      sport="MotoGP"
      title={event.name}
      subtitle={event.venue || event.city}
      date={formatDateIT(event.date)}
      time={event.time ? formatTimeIT(event.time, event.date) : undefined}
      status={getEventStatus(event.date)}
    />
  );
}

export default function HomePage() {
  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader
        title="Prossimi Eventi"
        subtitle="Segui gli eventi sportivi più importanti in tempo reale"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2"
      >
        <SinnerNextCard />
        <JuventusNextCard />
        <F1NextCard />
        <MotoGPNextCard />
      </motion.div>
    </div>
  );
}
