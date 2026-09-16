import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SerieATeam } from "@/lib/serieATeams";
import type { SquadPlayer, SquadRow, TeamSquad } from "@/lib/api/schemas";
import { toNumber } from "@/lib/api/schemas";
import { skyPlayerRef } from "@/lib/teamRoutes";
import { cn } from "@/lib/utils";
import PlayerStatsPanel from "./PlayerStatsPanel";
import RemoteImage from "./RemoteImage";

/**
 * La rosa: reparti, allenatore e stadio.
 *
 * Tre scelte di presentazione che vengono dai limiti della fonte, non dal
 * gusto — e che vanno lasciate dove sono finche' la fonte non cambia:
 *
 * - **si mostra l'eta', non la data di nascita**, perche' Sky da' solo
 *   «29 anni». Una data ricavata all'indietro sarebbe precisa al giorno e
 *   falsa;
 * - **foto protette da fallback**: prima il ritratto club di Sky, poi una
 *   seconda fonte con abbinamento esatto, infine un segnaposto esplicito;
 * - **la capienza dello stadio compare solo quando c'e'**: quattro squadre su
 *   venti non la dichiarano, e uno «0 posti» sarebbe un numero inventato.
 */
interface SquadSectionProps {
  team: SerieATeam;
  squad: TeamSquad;
  season: number;
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

/**
 * Una riga della rosa, che si apre sulle statistiche di quel giocatore.
 *
 * **Si apre solo se c'e' una scheda atleta da cui prenderle.** L'allenatore non
 * ne ha una — il suo nome sta in uno `<span>` proprio per questo — e la sua
 * riga resta testo: una riga che si apre sul nulla prometterebbe qualcosa.
 *
 * Quando la riga e' apribile il nome **non e' piu' un link**: un link dentro un
 * bottone non e' HTML valido, e il rimando a Sky si sposta dentro il pannello,
 * dove `DataSection` lo offre gia' negli stati di errore e di vuoto.
 *
 * Il pannello viene montato solo da aperta, ed e' quello che tiene in piedi il
 * conto delle richieste: una per giocatore aperto, nessuna per gli altri
 * ventiquattro.
 */
function Riga({ persona, season }: { persona: SquadRow; season: number }) {
  const [aperta, setAperta] = useState(false);
  const idPannello = useId();
  const riferimento = skyPlayerRef(persona.profileUrl);

  const numero = toNumber(persona.shirtNumber);
  const eta = toNumber(persona.ageYears);

  const contenuto = (
    <>
      {persona.playerId && (
        <RemoteImage
          src={persona.photoUrl}
          fallbackSrc={persona.fallbackPhotoUrl}
          alt={persona.name}
          className="h-14 w-14 shrink-0 rounded-md bg-muted object-cover object-top sm:h-16 sm:w-16"
          fallbackClassName="h-14 w-14 shrink-0 rounded-md sm:h-16 sm:w-16"
        />
      )}
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
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {riferimento || !persona.profileUrl ? (
          persona.name
        ) : (
          <a
            href={persona.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            {persona.name}
          </a>
        )}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground flex gap-2.5">
        {eta !== null && <span className="tabular-nums">{eta} anni</span>}
        <Misura valore={toNumber(persona.heightCm)} unita="m" />
        <Misura valore={toNumber(persona.weightKg)} unita="kg" />
      </span>
    </>
  );

  if (!riferimento) {
    return (
      <li className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
        {contenuto}
      </li>
    );
  }

  return (
    <li className="border-b border-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setAperta((v) => !v)}
        aria-expanded={aperta}
        aria-controls={idPannello}
        className="flex w-full items-center gap-3 rounded-md py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--team-accent))]"
      >
        {contenuto}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            aperta && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {aperta && (
        <div id={idPannello}>
          <PlayerStatsPanel riferimento={riferimento} nome={persona.name} season={season} />
        </div>
      )}
    </li>
  );
}

export default function SquadSection({ team, squad, season }: SquadSectionProps) {
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
            <Riga persona={squad.manager} season={season} />
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
              <Riga key={p.playerId ?? `${p.role}-${p.name}`} persona={p} season={season} />
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[11px] text-muted-foreground">
        Tocca un giocatore per le sue statistiche di stagione.
      </p>
      <span className="sr-only">Rosa del {team.name}</span>
    </div>
  );
}
