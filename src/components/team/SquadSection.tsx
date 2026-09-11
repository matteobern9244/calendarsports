import { useMemo } from "react";
import type { SerieATeam } from "@/lib/serieATeams";
import type { SquadPlayer, SquadRow, TeamSquad } from "@/lib/api/schemas";
import { toNumber } from "@/lib/api/schemas";

/**
 * La rosa: reparti, allenatore e stadio.
 *
 * Tre scelte di presentazione che vengono dai limiti della fonte, non dal
 * gusto — e che vanno lasciate dove sono finche' la fonte non cambia:
 *
 * - **si mostra l'eta', non la data di nascita**, perche' Sky da' solo
 *   «29 anni». Una data ricavata all'indietro sarebbe precisa al giorno e
 *   falsa;
 * - **niente foto**: nella tabella della rosa ci sono solo bandiere. Le foto
 *   esistono, ma nel JSON delle probabili formazioni e solo per gli undici;
 * - **la capienza dello stadio compare solo quando c'e'**: quattro squadre su
 *   venti non la dichiarano, e uno «0 posti» sarebbe un numero inventato.
 */
interface SquadSectionProps {
  team: SerieATeam;
  squad: TeamSquad;
}

/** I reparti nell'ordine della fonte, che e' gia' ordine di campo. */
function byRole(players: SquadPlayer[]): Array<{ role: string; players: SquadPlayer[] }> {
  const groups = new Map<string, SquadPlayer[]>();
  for (const p of players) {
    const existing = groups.get(p.role);
    if (existing) existing.push(p);
    else groups.set(p.role, [p]);
  }
  return [...groups].map(([role, list]) => ({ role, players: list }));
}

function Misura({ valore, unita }: { valore: number | null; unita: string }) {
  if (valore === null) return null;
  return (
    <span className="tabular-nums">
      {unita === "m" ? `${(valore / 100).toFixed(2).replace(".", ",")} m` : `${valore} ${unita}`}
    </span>
  );
}

function Riga({ persona }: { persona: SquadRow }) {
  const numero = toNumber(persona.shirtNumber);
  const eta = toNumber(persona.ageYears);
  const nome = persona.profileUrl ? (
    <a
      href={persona.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-primary transition-colors"
    >
      {persona.name}
    </a>
  ) : (
    persona.name
  );

  return (
    <li className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="w-7 shrink-0 text-right font-heading text-sm text-muted-foreground tabular-nums">
        {numero ?? "—"}
      </span>
      {persona.countryCode && (
        <img
          src={`https://static.sky.it/images/skysport/it/common/flags/${persona.countryCode}.svg`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
        />
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{nome}</span>
      <span className="shrink-0 text-xs text-muted-foreground flex gap-2.5">
        {eta !== null && <span className="tabular-nums">{eta} anni</span>}
        <Misura valore={toNumber(persona.heightCm)} unita="m" />
        <Misura valore={toNumber(persona.weightKg)} unita="kg" />
      </span>
    </li>
  );
}

export default function SquadSection({ team, squad }: SquadSectionProps) {
  const reparti = useMemo(() => byRole(squad.players), [squad.players]);
  const capienza = toNumber(squad.stadium?.capacity);
  const anno = toNumber(squad.stadium?.yearOfConstruction);

  return (
    <div className="space-y-6">
      {squad.stadium && (
        <section className="rounded-lg border border-border/60 bg-card/60 p-4">
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Stadio
          </h3>
          <p className="font-heading text-lg font-bold">{squad.stadium.name}</p>
          <p className="text-sm text-muted-foreground">
            {[squad.stadium.cityName, squad.stadium.address].filter(Boolean).join(" · ")}
          </p>
          {(capienza !== null || anno !== null) && (
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {[
                capienza !== null ? `${capienza.toLocaleString("it-IT")} posti` : null,
                anno !== null ? `dal ${anno}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </section>
      )}

      {squad.manager && (
        <section className="rounded-lg border border-border/60 bg-card/60 p-4">
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Allenatore
          </h3>
          <ul>
            <Riga persona={squad.manager} />
          </ul>
        </section>
      )}

      {reparti.map(({ role, players }) => (
        <section key={role}>
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {role} <span className="text-muted-foreground/60 tabular-nums">({players.length})</span>
          </h3>
          <ul>
            {players.map((p) => (
              <Riga key={p.playerId ?? `${p.role}-${p.name}`} persona={p} />
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[11px] text-muted-foreground">
        Rosa e allenatore da Sky Sport; stadio dalla Lega Serie A. L'età è quella pubblicata dalla
        fonte, che non espone la data di nascita.
      </p>
      <span className="sr-only">Rosa del {team.name}</span>
    </div>
  );
}
