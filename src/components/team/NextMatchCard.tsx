import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import EventCountdown from "@/components/common/EventCountdown";
import TeamLogo from "@/components/common/TeamLogo";
import type { FootballMatch } from "@/lib/api/schemas";
import { getBroadcasterStyle } from "@/lib/broadcasterStyle";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { matchSide } from "@/lib/teamMatch";
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

/** La card «Prossima Partita» in testa alla pagina squadra. */
export default function NextMatchCard({ team, match, onRetry }: NextMatchCardProps) {
  const { isHome, opponent, opponentLogo, prefix, venue } = matchSide(match, team);
  const { date: dateStr, time: timeStr } = formatFootballDateTime(match.date);
  const compColor = COMPETITION_COLORS[match.competition] || "";
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
        aria-label={`Apri dettaglio ${isHome ? `${team.name} vs ${opponent}` : `${opponent} vs ${team.name}`}, ${team.name} ${venue}`}
        className="block px-5 py-5 sm:px-6 sm:py-6 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--team-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[hsl(var(--team-accent))] to-transparent opacity-80"
        />
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[hsl(var(--team-accent))]" aria-hidden="true" />
          <span className="font-heading text-[10px] tracking-[0.2em] uppercase text-[hsl(var(--team-accent-text))] font-bold">
            Prossima Partita
          </span>
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
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">
                {prefix} {opponent}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dateStr}
                {timeStr ? ` · ${timeStr}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {match.broadcaster && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {match.broadcaster.split(" | ").map((b: string) => {
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
              </div>
            )}
            {match.date && <EventCountdown startDate={match.date} onRetry={onRetry} />}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
