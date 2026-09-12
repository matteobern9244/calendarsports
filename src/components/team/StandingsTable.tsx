import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TeamLogo from "@/components/common/TeamLogo";
import type { FootballStandingRow } from "@/lib/api/schemas";
import { formatGoalDiff } from "@/lib/teamMatch";
import { matchesTeam, type SerieATeam } from "@/lib/serieATeams";
import { cn } from "@/lib/utils";

interface StandingsTableProps {
  /** La squadra di cui evidenziare la riga. */
  team: SerieATeam;
  standings: FootballStandingRow[];
}

/** La classifica di Serie A, con la riga della squadra scelta evidenziata. */
export default function StandingsTable({ team, standings }: StandingsTableProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 font-heading text-xs tracking-wider uppercase">
              Pos
            </TableHead>
            <TableHead className="font-heading text-xs tracking-wider uppercase">Squadra</TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
              G
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
              V
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase max-[380px]:hidden">
              N
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase max-[380px]:hidden">
              P
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase hidden sm:table-cell">
              DR
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
              Pts
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((s) => {
            const evidenziata = matchesTeam(s.team, team);
            return (
              <TableRow
                key={s.position}
                className={cn(
                  evidenziata &&
                    "relative bg-linear-to-r from-[hsl(var(--team-accent))]/20 via-[hsl(var(--team-accent))]/8 to-transparent border-l-4 border-[hsl(var(--team-accent))] hover:bg-linear-to-r hover:from-[hsl(var(--team-accent))]/25 hover:via-[hsl(var(--team-accent))]/10 hover:to-transparent",
                )}
              >
                <TableCell
                  className={cn(
                    "font-heading font-bold",
                    evidenziata && "text-[hsl(var(--team-accent-text))] text-base",
                  )}
                >
                  {s.position}
                </TableCell>
                <TableCell
                  className={cn(
                    evidenziata
                      ? "text-[hsl(var(--team-accent-text))] font-heading font-bold text-base"
                      : "font-semibold",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      src={s.logoUrl}
                      name={s.team}
                      size={evidenziata ? 28 : 20}
                      shape="circle"
                      className={
                        evidenziata
                          ? "ring-2 ring-[hsl(var(--team-accent))]/60 ring-offset-1 ring-offset-background"
                          : undefined
                      }
                    />
                    {s.team}
                  </div>
                </TableCell>
                <TableCell className="text-center">{s.played}</TableCell>
                <TableCell className="text-center">{s.wins}</TableCell>
                {/*
                  Pareggi e sconfitte spariscono **solo** sotto i 380px, non su
                  tutto il mobile: su un telefono normale ci stanno, e togliere
                  contenuto dove ci starebbe e' un danno gratuito. Sotto quella
                  soglia la classifica resta leggibile con posizione, squadra,
                  giocate, vinte e punti — e soprattutto non scorre di lato.
                */}
                <TableCell className="text-center max-[380px]:hidden">{s.draws}</TableCell>
                <TableCell className="text-center max-[380px]:hidden">{s.losses}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {formatGoalDiff(s.goalDiff)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center font-bold",
                    evidenziata && "text-[hsl(var(--team-accent-text))] font-heading text-base",
                  )}
                >
                  {s.points}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
