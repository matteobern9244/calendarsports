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
import { formatGoalDiff, isJuventus } from "@/lib/juventusMatch";
import { cn } from "@/lib/utils";

interface StandingsTableProps {
  standings: FootballStandingRow[];
}

/** La classifica di Serie A, con la riga bianconera evidenziata. */
export default function StandingsTable({ standings }: StandingsTableProps) {
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
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
              N
            </TableHead>
            <TableHead className="text-center font-heading text-xs tracking-wider uppercase">
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
            const isJuve = isJuventus(s.team);
            return (
              <TableRow
                key={s.position}
                className={cn(
                  isJuve &&
                    "relative bg-linear-to-r from-[hsl(var(--gold))]/20 via-[hsl(var(--gold))]/8 to-transparent border-l-4 border-[hsl(var(--gold))] hover:bg-linear-to-r hover:from-[hsl(var(--gold))]/25 hover:via-[hsl(var(--gold))]/10 hover:to-transparent",
                )}
              >
                <TableCell
                  className={cn(
                    "font-heading font-bold",
                    isJuve && "text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] text-base",
                  )}
                >
                  {s.position}
                </TableCell>
                <TableCell
                  className={cn(
                    isJuve
                      ? "text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] font-heading font-bold text-base"
                      : "font-semibold",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      src={s.logoUrl}
                      name={s.team}
                      size={isJuve ? 28 : 20}
                      shape="circle"
                      className={
                        isJuve
                          ? "ring-2 ring-[hsl(var(--gold))]/60 ring-offset-1 ring-offset-background"
                          : undefined
                      }
                    />
                    {s.team}
                  </div>
                </TableCell>
                <TableCell className="text-center">{s.played}</TableCell>
                <TableCell className="text-center">{s.wins}</TableCell>
                <TableCell className="text-center">{s.draws}</TableCell>
                <TableCell className="text-center">{s.losses}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {formatGoalDiff(s.goalDiff)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center font-bold",
                    isJuve &&
                      "text-[hsl(var(--gold-dark))] dark:text-[hsl(var(--gold))] font-heading text-base",
                  )}
                >
                  {s.points}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="p-3 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground">Fonte: Sky Sport Italia</p>
      </div>
    </div>
  );
}
