import { motion } from "framer-motion";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import EventCountdown from "@/components/common/EventCountdown";
import MatchScore from "@/components/common/MatchScore";
import TeamLogo from "@/components/common/TeamLogo";
import { useNowMinute } from "@/hooks/useNow";
import type { FootballMatch } from "@/lib/api/schemas";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { matchPhase, matchScore } from "@/lib/matchPhase";
import { matchSide } from "@/lib/teamMatch";
import MatchPhaseBadge from "./MatchPhaseBadge";
import type { SerieATeam } from "@/lib/serieATeams";
import { teamMatchPath } from "@/lib/teamRoutes";
import { cn } from "@/lib/utils";
import { COMPETITION_COLORS } from "./competitionColors";

interface NextMatchCardProps {
  /** La squadra dal cui calendario si guarda la partita. */
  team: SerieATeam;
  match: FootballMatch;
  /** Il «Riprova» del conto alla rovescia: un refetch del calendario. */
  onRetry: () => void;
}

/**
 * La card della partita in evidenza, in testa alla pagina squadra.
 *
 * Si chiamava «Prossima Partita» e lo scriveva come letterale fisso, anche
 * mentre il conto alla rovescia accanto lampeggiava «IN DIRETTA · da 54m». Ora
 * l'etichetta segue la fase, e il punteggio non si deve piu' andare a cercare
 * in fondo al dettaglio.
 */
export default function NextMatchCard({ team, match, onRetry }: NextMatchCardProps) {
  const now = useNowMinute();
  const { fase } = matchPhase(match, now);
  const punteggio = matchScore(match, now);
  const { isHome, opponent, opponentLogo, prefix, venue } = matchSide(match, team);
  const { date: dateStr, time: timeStr } = formatFootballDateTime(match.date);
  const compColor = COMPETITION_COLORS[match.competition] || "";
  const fraseFase = fase === "in-corso" ? ", in corso" : fase === "finita" ? ", terminata" : "";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative mb-6 overflow-hidden rounded-2xl border border-[hsl(var(--team-accent))]/40",
        "bg-linear-to-br from-[hsl(var(--team-accent))]/15 via-card to-[hsl(var(--team-accent-dark))]/20",
        "shadow-[0_18px_44px_-22px_hsl(var(--team-accent)/0.55),0_4px_14px_-6px_hsl(var(--navy-dark)/0.45)]",
      )}
    >
      {/*
        Il lato entra nel nome accessibile del collegamento e non in un testo
        nascosto accanto al segno: `aria-label` **sostituisce** il nome
        calcolato dal sottoalbero, quindi uno `sr-only` la' dentro non verrebbe
        mai letto. La squadra e' nominata perche' «in trasferta» da solo non
        dice di chi.
      */}
      <Link
        to={teamMatchPath(team, match.id)}
        aria-label={`Apri dettaglio ${isHome ? `${team.name} vs ${opponent}` : `${opponent} vs ${team.name}`}, ${team.name} ${venue}${fraseFase}`}
        className="block px-5 py-5 sm:px-6 sm:py-6 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--team-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[hsl(var(--team-accent))] to-transparent opacity-80"
        />
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <MatchPhaseBadge fase={fase} />
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 h-4 border",
              compColor,
            )}
          >
            {match.competition}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Decorativo: il nome dell'avversario e' scritto qui accanto. */}
            <span aria-hidden="true" className="flex shrink-0">
              <TeamLogo src={opponentLogo} name={opponent} size={48} shape="circle" />
            </span>
            <div className="min-w-0">
              {/*
                Una riga sola, e nomina **solo l'avversario**. Prima ce n'erano
                due — «LAZIO @» sopra, «Milan» sotto — e componevano una frase
                che diceva l'opposto del dato: il Milan in casa mentre il
                calendario, tre centimetri piu' giu', scriveva «@ Lazio». Che
                la squadra della pagina sia il Milan lo dice gia' il titolo, e
                lo stemma qui accanto e' dell'avversario: nominarlo qui
                significava mettere un nome accanto allo stemma di un altro.
              */}
              <div className="flex items-baseline gap-3 min-w-0">
                <p className="min-w-0 text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                  {prefix} {opponent}
                </p>
                {/*
                  `shrink-0` sul punteggio e `min-w-0` sul nome tengono il
                  troncamento dalla parte giusta: senza, un avversario dal nome
                  lungo spingerebbe fuori proprio il numero che si cerca.
                */}
                <MatchScore score={punteggio} scala="card" className="shrink-0" />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dateStr}
                {timeStr ? ` · ${timeStr}` : ""}
              </p>
            </div>
          </div>
          {/*
            Emittenti e conto alla rovescia sulla **stessa riga**, che va a
            capo solo se non ci sta. Prima erano due righe in colonna, e fra le
            due restava una fascia vuota che in mobile allungava la card senza
            dire niente.
          */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {match.broadcaster?.split(" | ").map((b: string) => {
              const { className } = getBroadcasterStyle(b);
              return (
                <span
                  key={b}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    className,
                  )}
                >
                  {b.trim()}
                </span>
              );
            })}
            {match.date && fase !== "finita" && (
              <EventCountdown startDate={match.date} onRetry={onRetry} />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
