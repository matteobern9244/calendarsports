import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import EventCountdown from "@/components/common/EventCountdown";
import TeamLogo from "@/components/common/TeamLogo";
import { useNowMinute } from "@/hooks/useNow";
import { useCountdownMode } from "@/hooks/useCountdownMode";
import { useMatchDetail } from "@/hooks/useSportsData";
import type { FootballMatch, MatchDetail } from "@/lib/api/schemas";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { intervalloLive } from "@/lib/liveRefresh";
import { matchPhase, matchScore, type FasePartita } from "@/lib/matchPhase";
import type { SerieATeam } from "@/lib/serieATeams";
import { matchResultLabel, matchSide, resultOf, teamIsPlaying } from "@/lib/teamMatch";
import { cn } from "@/lib/utils";
import { COMPETITION_COLORS } from "./competitionColors";
import MatchPhaseBadge from "./MatchPhaseBadge";

/**
 * La testata del dettaglio partita: chi gioca, a che punto e', com'e' finita.
 *
 * ## Perche' il risultato e' salito qui
 *
 * Stava dentro la scheda «Risultato», la quarta di cinque, e per leggerlo
 * bisognava aprire il dettaglio e poi sapere dove cercare. In cima c'era gia'
 * un punteggio — un secondo, scritto a mano, con un'altra scala di caratteri —
 * ma solo a partita finita: durante il gioco mostrava «vs».
 *
 * ## Il costo della richiesta, e come si governa
 *
 * I widget del dettaglio pesano un centinaio di kilobyte, ed e' la ragione per
 * cui la scheda predefinita e' «Anteprima», che non ne ha bisogno. Prima del
 * fischio d'inizio non c'e' niente che il dettaglio possa aggiungere — niente
 * marcatori, niente arbitro, nessun punteggio — quindi **non si chiede**: il
 * ramo `prepartita` non monta nemmeno l'hook, e quel caso resta gratuito come
 * prima. A partita cominciata la richiesta parte, ed e' esattamente il momento
 * in cui il risultato e' cio' per cui si apre la pagina.
 *
 * ## La degradazione
 *
 * Il punteggio ha due fonti: il calendario, che la pagina ha gia' in mano, e
 * il dettaglio, che e' quello che si aggiorna mentre si gioca. Se discordano
 * vince il dettaglio. Se il dettaglio tace o fallisce, resta il calendario e
 * il blocco si accorcia — senza riquadri d'errore: un errore in cima a una
 * pagina che i dati ce li ha sarebbe un guasto inventato, e il racconto del
 * guasto appartiene alle schede, che hanno gia' `DataSection`.
 */

interface MatchHeroProps {
  team: SerieATeam;
  match: FootballMatch;
  /** Il «Riprova» del conto alla rovescia: un refetch del calendario. */
  onRetry: () => void;
}

export default function MatchHero({ team, match, onRetry }: MatchHeroProps) {
  const now = useNowMinute();
  const { fase } = matchPhase(match, now);
  const punteggio = matchScore(match, now);

  // Prima del fischio d'inizio, e quando la fonte non pubblica un
  // identificativo, non c'e' niente da chiedere: si rende il ramo che non apre
  // nessuna query.
  if (fase === "prepartita" || !match.skyMatchId) {
    return (
      <Testata
        team={team}
        match={match}
        fase={fase}
        score={punteggio}
        dettaglio={null}
        onRetry={onRetry}
      />
    );
  }

  return (
    <TestataConDettaglio
      team={team}
      match={match}
      fase={fase}
      scoreDiRipiego={punteggio}
      onRetry={onRetry}
    />
  );
}

function TestataConDettaglio({
  team,
  match,
  fase,
  scoreDiRipiego,
  onRetry,
}: {
  team: SerieATeam;
  match: FootballMatch;
  fase: FasePartita;
  scoreDiRipiego: { home: number; away: number } | null;
  onRetry: () => void;
}) {
  // Mentre si gioca il risultato cambia, e una pagina aperta al 20' non deve
  // restare ferma al 20'. Fuori dalla partita l'intervallo e' `false`, e al
  // fischio finale si spegne da solo al primo refetch che porta lo stato nuovo.
  const { mode } = useCountdownMode();
  const { data } = useMatchDetail(match.skyMatchId, intervalloLive(fase, mode));
  return (
    <Testata
      team={team}
      match={match}
      fase={fase}
      score={data?.score ?? scoreDiRipiego}
      dettaglio={data ?? null}
      onRetry={onRetry}
    />
  );
}

function Testata({
  team,
  match,
  fase,
  score,
  dettaglio,
  onRetry,
}: {
  team: SerieATeam;
  match: FootballMatch;
  fase: FasePartita;
  score: { home: number; away: number } | null;
  dettaglio: MatchDetail | null;
  onRetry: () => void;
}) {
  const { isHome } = matchSide(match, team);
  const { date: dateStr, time: timeStr } = formatFootballDateTime(match.date);
  const compColor = COMPETITION_COLORS[match.competition] || "";

  // L'esito solo a partita conclusa, e solo se la squadra della pagina e' in
  // campo: il punteggio e' un dato, l'esito e' un giudizio.
  const esito =
    fase === "finita" && score && teamIsPlaying(match, team) ? resultOf(score, isHome) : null;

  const gol = (dettaglio?.events ?? []).filter((e) => e.type === "GOAL");
  const nomeCasa = dettaglio?.home?.teamName ?? match.homeTeam;
  const nomeTrasferta = dettaglio?.away?.teamName ?? match.awayTeam;

  const broadcasters = match.broadcaster
    ? String(match.broadcaster)
        .split(" | ")
        .map((b) => b.trim())
        .filter(Boolean)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative mt-6 mb-6 overflow-hidden rounded-2xl border border-[hsl(var(--team-accent))]/40 px-5 py-5 sm:px-6 sm:py-6",
        "bg-linear-to-br from-[hsl(var(--team-accent))]/15 via-card to-[hsl(var(--team-accent-dark))]/20",
        "shadow-[0_18px_44px_-22px_hsl(var(--team-accent)/0.55),0_4px_14px_-6px_hsl(var(--navy-dark)/0.45)]",
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[hsl(var(--team-accent))] to-transparent opacity-80"
      />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <MatchPhaseBadge fase={fase} />
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border",
            compColor,
          )}
        >
          {match.competition}
        </Badge>
        {match.matchday != null && (
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            {match.competition === "Serie A"
              ? `Giornata ${match.matchday}`
              : `Turno ${match.matchday}`}
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-6"
        data-testid="confronto-testata"
      >
        <section
          aria-label={`${match.homeTeam} in casa`}
          className="flex min-w-0 flex-col items-center gap-2 text-center"
        >
          <TeamLogo src={match.homeLogo} name={match.homeTeam} size={56} shape="circle" />
          <p className="w-full text-sm sm:text-base font-heading font-bold text-foreground line-clamp-2">
            {match.homeTeam}
          </p>
        </section>

        <div
          className="flex min-w-14 flex-col items-center justify-center pt-2 text-center sm:min-w-24"
          data-testid="punteggio-testata"
        >
          {score ? (
            <>
              <span
                aria-hidden="true"
                className="whitespace-nowrap font-heading text-3xl font-bold tabular-nums sm:text-5xl"
              >
                {score.home} - {score.away}
              </span>
              <span className="sr-only">{`${score.home} a ${score.away}`}</span>
            </>
          ) : (
            <span className="font-heading text-2xl font-bold text-muted-foreground sm:text-3xl">vs</span>
          )}
        </div>

        <section
          aria-label={`${match.awayTeam} in trasferta`}
          className="flex min-w-0 flex-col items-center gap-2 text-center"
        >
          <TeamLogo src={match.awayLogo} name={match.awayTeam} size={56} shape="circle" />
          <p className="w-full text-sm sm:text-base font-heading font-bold text-foreground line-clamp-2">
            {match.awayTeam}
          </p>
        </section>

        <div className="col-span-3 text-center">
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            {dateStr}
            {timeStr ? ` · ${timeStr}` : ""}
          </span>
        </div>
      </div>

      {esito && (
        <p
          className={cn(
            "mt-4 text-center font-heading text-sm font-bold uppercase tracking-widest",
            esito === "V" && "text-success",
            esito === "S" && "text-destructive",
            esito === "P" && "text-muted-foreground",
          )}
        >
          {matchResultLabel(esito, team)}
        </p>
      )}

      {gol.length > 0 && (
        <ul className="mx-auto mt-4 w-full max-w-md space-y-1 border-t border-border/40 pt-3 text-sm">
          {gol.map((e, i) => (
            <li key={`${e.minute}-${e.player}-${i}`} className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "font-heading text-xs font-bold tabular-nums shrink-0",
                  (e.side === "home") === isHome && "text-[hsl(var(--team-accent-text))]",
                )}
              >
                {e.minute}'
              </span>
              <span className="min-w-0 flex-1 truncate">{e.player}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground truncate max-w-[40%]">
                {e.side === "home" ? nomeCasa : nomeTrasferta}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(dettaglio?.venue || dettaglio?.referee) && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          {[dettaglio.venue, dettaglio.referee && `Arbitro: ${dettaglio.referee}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
        {broadcasters.map((b) => {
          const { className } = getBroadcasterStyle(b);
          return (
            <span
              key={b}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                className,
              )}
            >
              {b}
            </span>
          );
        })}
        {fase !== "finita" && match.date && (
          <EventCountdown startDate={match.date} onRetry={onRetry} />
        )}
      </div>
    </motion.div>
  );
}
