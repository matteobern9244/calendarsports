import { useMemo } from "react";
import type { SerieATeam } from "@/lib/serieATeams";
import type { FootballMatch, FootballStandingRow } from "@/lib/api/schemas";
import {
  andamentoPunti,
  formaRecente,
  kpiSquadra,
  mediaCampionato,
  partiteDiCampionato,
  ripartizioneCasaTrasferta,
  type Totali,
} from "@/lib/teamStats";
import { AndamentoPunti, BarraRendimento, ConfrontoMedia } from "./StatsCharts";
import { COLORE_ESITO, formattaMedia } from "./statsPresentation";
import { cn } from "@/lib/utils";

/**
 * La scheda «Statistiche»: numeri della squadra e confronto con il campionato.
 *
 * ## Da dove vengono i numeri, e perche' e' importante saperlo
 *
 * Da due dati che l'app gia' mostra: la **classifica di Serie A** e il
 * **calendario della squadra**. Nessuna fonte nuova, quindi nessuna fonte
 * nuova da dichiarare in `docs/DATA_SOURCES.md` e nessun modo nuovo di
 * rompersi.
 *
 * I totali (punti, gol, vittorie) vengono dalla classifica, che e' la forma
 * in cui la fonte li pubblica. L'andamento e la divisione fra casa e
 * trasferta vengono invece rifatti sulle singole partite, perche' la
 * classifica non li contiene.
 *
 * I due conti possono non coincidere, ed e' bene aspettarselo: la classifica
 * si aggiorna a fine giornata, il calendario partita per partita. Per questo
 * i totali in alto sono sempre e solo quelli della classifica, mai una somma
 * nostra: due numeri diversi per la stessa cosa nella stessa schermata sono
 * peggio di un numero solo leggermente vecchio.
 *
 * ## Cosa non c'e'
 *
 * Le statistiche **per giocatore** — minuti, gol, assist, cartellini.
 *
 * La domanda e' stata chiusa con una misura, non con una stima: interrogata
 * con una chiave vera l'11 settembre 2026, API-Football risponde
 * `Free plans do not have access to this season, try from 2022 to 2024`, e
 * l'API della Lega Serie A — l'unica alternativa gia' in uso — risponde `404`
 * a `players` e `statistics`. Il dato non e' raggiungibile senza pagare.
 *
 * Percio' qui non c'e', ed e' scritto in pagina **con la sua ragione**. La
 * scorciatoia da non prendere e' servire le stagioni che il piano gratuito
 * copre: sarebbero numeri veri del 2024 sotto il titolo del 2026, cioe' un
 * dato vecchio presentato come attuale — la cosa che `AGENTS.md` vieta.
 */
interface StatsBoardProps {
  team: SerieATeam;
  standings: FootballStandingRow[];
  matches: FootballMatch[];
}

function Cartellino({
  etichetta,
  valore,
  nota,
}: {
  etichetta: string;
  valore: string;
  nota?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
        {etichetta}
      </p>
      <p className="mt-0.5 font-heading text-xl font-bold tabular-nums text-[hsl(var(--team-accent-text))]">
        {valore}
      </p>
      {nota && <p className="text-[11px] text-muted-foreground tabular-nums">{nota}</p>}
    </div>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border/60 bg-card/60 p-4">
      <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-3">
        {titolo}
      </h3>
      {children}
    </section>
  );
}

function ColonnaTotali({ titolo, totali }: { titolo: string; totali: Totali }) {
  return (
    <div>
      <p className="font-heading text-[11px] uppercase tracking-widest text-muted-foreground">
        {titolo}
      </p>
      <p className="mt-1 font-heading text-lg font-bold tabular-nums">
        {totali.points} <span className="text-sm font-normal text-muted-foreground">punti</span>
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        {totali.wins}V · {totali.draws}N · {totali.losses}S
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {totali.goalsFor}:{totali.goalsAgainst} in {totali.played}{" "}
        {totali.played === 1 ? "partita" : "partite"}
      </p>
    </div>
  );
}

export default function StatsBoard({ team, standings, matches }: StatsBoardProps) {
  // Memoizzati perche' `matches` e' l'intera stagione e la scheda ri-renderizza
  // a ogni cambio di tema o di larghezza: rifare tre volte il giro delle
  // partite per disegnare gli stessi grafici sarebbe lavoro buttato.
  const { kpi, media, giocate } = useMemo(
    () => ({
      kpi: kpiSquadra(standings, team),
      media: mediaCampionato(standings),
      giocate: partiteDiCampionato(matches, team),
    }),
    [standings, matches, team],
  );

  const andamento = useMemo(() => andamentoPunti(giocate), [giocate]);
  const { casa, trasferta } = useMemo(() => ripartizioneCasaTrasferta(giocate), [giocate]);
  const forma = formaRecente(giocate);

  if (!kpi) {
    return (
      <p className="text-sm text-muted-foreground">
        {team.name} non compare nella classifica di questa stagione, quindi non ci sono statistiche
        di campionato da mostrare.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cartellino
          etichetta="Posizione"
          valore={kpi.position === null ? "—" : `${kpi.position}º`}
          nota={`${kpi.played} ${kpi.played === 1 ? "partita" : "partite"}`}
        />
        <Cartellino
          etichetta="Punti"
          valore={String(kpi.points)}
          nota={`${formattaMedia(kpi.pointsPerMatch)} a partita`}
        />
        <Cartellino
          etichetta="Differenza reti"
          valore={`${kpi.goalDiff > 0 ? "+" : ""}${kpi.goalDiff}`}
          nota={`${kpi.goalsFor} fatti · ${kpi.goalsAgainst} subiti`}
        />
        <Cartellino
          etichetta="Vittorie"
          valore={kpi.winRate === null ? "—" : `${Math.round(kpi.winRate * 100)}%`}
          nota={`${kpi.wins} su ${kpi.played}`}
        />
      </div>

      <Sezione titolo="Rendimento in campionato">
        <BarraRendimento vinte={kpi.wins} nulle={kpi.draws} perse={kpi.losses} />
        {forma.length > 0 && (
          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="font-heading text-[11px] uppercase tracking-widest text-muted-foreground">
              Ultime {forma.length}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {forma.map((m) => (
                <li key={m.id}>
                  <span
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white",
                      COLORE_ESITO[m.esito],
                    )}
                  >
                    <span className="font-heading font-bold">{m.esito}</span>
                    <span className="tabular-nums opacity-90">
                      {m.goalsFor}-{m.goalsAgainst}
                    </span>
                    <span className="max-w-24 truncate opacity-90">
                      {m.home ? "" : "a "}
                      {m.opponent}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sezione>

      <Sezione titolo="Andamento punti">
        <AndamentoPunti punti={andamento} mediaPerPartita={media?.pointsPerMatch ?? null} />
      </Sezione>

      <Sezione titolo="Contro la media del campionato">
        <ConfrontoMedia
          righe={[
            {
              label: "Punti a partita",
              valore: kpi.pointsPerMatch,
              media: media?.pointsPerMatch ?? null,
              piuEMeglio: true,
            },
            {
              label: "Gol fatti a partita",
              valore: kpi.goalsForPerMatch,
              media: media?.goalsForPerMatch ?? null,
              piuEMeglio: true,
            },
            {
              // L'unica riga in cui stare sopra la media e' una brutta notizia.
              label: "Gol subiti a partita",
              valore: kpi.goalsAgainstPerMatch,
              media: media?.goalsAgainstPerMatch ?? null,
              piuEMeglio: false,
            },
          ]}
        />
      </Sezione>

      {giocate.length > 0 && (
        <Sezione titolo="Casa e trasferta">
          <div className="grid grid-cols-2 gap-4">
            <ColonnaTotali titolo="In casa" totali={casa} />
            <ColonnaTotali titolo="In trasferta" totali={trasferta} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Contati sulle partite di Serie A già giocate: coppe e Champions non danno punti in
            campionato.
          </p>
        </Sezione>
      )}

      <span className="sr-only">Statistiche di campionato del {team.name}</span>
    </div>
  );
}
