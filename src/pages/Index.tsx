import EventCard from "@/components/common/EventCard";
import SectionHeader from "@/components/common/SectionHeader";
import { motion } from "framer-motion";
import { useF1NextRace, useJuventusInfo, useSinnerInfo, useMotoGPNextEvent } from "@/hooks/useSportsData";
import { formatDateIT, formatTimeIT, getEventStatus } from "@/lib/dateUtils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function F1NextCard() {
  const { data, isLoading, error } = useF1NextRace();
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
          {data.firstPractice && <span>PL1: {formatTimeIT(data.firstPractice.time, data.firstPractice.date)}</span>}
          {data.sprint && <span>Sprint: {formatTimeIT(data.sprint.time, data.sprint.date)}</span>}
          {data.qualifying && <span>Qual: {formatTimeIT(data.qualifying.time, data.qualifying.date)}</span>}
          <span className="col-span-2 font-semibold text-primary">Gara: {formatDateIT(data.date)} {formatTimeIT(data.time, data.date)}</span>
        </div>
      </div>
    </EventCard>
  );
}

function JuventusNextCard() {
  const { data, isLoading, error } = useJuventusInfo(2025);
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data) return (
    <EventCard sport="Calcio · Juventus" title="Juventus" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">Dati non disponibili al momento</p>
    </EventCard>
  );
  return (
    <EventCard
      sport="Calcio · Serie A"
      title={`Juventus — ${data.position}° posto`}
      subtitle={`${data.points} punti · ${data.wins}V ${data.draws}N ${data.losses}P`}
      date={`${data.played} partite giocate`}
      status="prossimo"
    >
      {data.lastMatches && data.lastMatches.length > 0 && (
        <div className="flex gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Ultime:</span>
          {data.lastMatches.map((m: any, i: number) => (
            <span key={i} className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
              m.result === 'V' ? 'bg-green-500/20 text-green-600' :
              m.result === 'P' ? 'bg-red-500/20 text-red-600' :
              'bg-yellow-500/20 text-yellow-600'
            }`}>{m.result}</span>
          ))}
        </div>
      )}
    </EventCard>
  );
}

function SinnerNextCard() {
  const { data, isLoading, error } = useSinnerInfo();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data) return (
    <EventCard sport="Tennis · Jannik Sinner" title="Jannik Sinner" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">Dati non disponibili al momento</p>
    </EventCard>
  );
  return (
    <EventCard
      sport="Tennis · ATP"
      title={data.name}
      subtitle={`Ranking ATP: #${data.ranking || '1'} · ${data.nationality}`}
      date={`Nato: ${data.birthDate}`}
      status="prossimo"
    >
      <p className="text-xs text-muted-foreground">
        {data.height} · {data.weight} · Pro dal {data.turnedPro}
      </p>
    </EventCard>
  );
}

function MotoGPNextCard() {
  const { data, isLoading, error } = useMotoGPNextEvent();
  if (isLoading) return <div className="rounded-xl border border-border bg-card p-5 animate-pulse h-32" />;
  if (error || !data) return (
    <EventCard sport="MotoGP" title="Prossimo GP" date="—" status="prossimo">
      <p className="text-xs text-muted-foreground">Dati non disponibili al momento</p>
    </EventCard>
  );
  return (
    <EventCard
      sport="MotoGP"
      title={data.name}
      subtitle={[data.circuit, data.country].filter(Boolean).join(' · ')}
      date={data.dateStart ? formatDateIT(data.dateStart) : '—'}
      status={data.dateStart ? getEventStatus(data.dateStart) : 'prossimo'}
    />
  );
}

export default function HomePage() {
  return (
    <div className="container py-8 sm:py-12">
      <SectionHeader
        title="Prossimi Eventi"
        subtitle="Dati reali da Jolpica (F1), Sky Sport Italia (Juventus), ATP Tour (Sinner), MotoGP.com"
      />
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2">
        <SinnerNextCard />
        <JuventusNextCard />
        <F1NextCard />
        <MotoGPNextCard />
      </motion.div>
    </div>
  );
}
