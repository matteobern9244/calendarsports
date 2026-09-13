import { Lato } from "./LineupsBoard";
import EmptyState from "@/components/common/EmptyState";
import type { MatchDetail, MatchEvent } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";

/**
 * Le quattro schede del dettaglio partita, con i dati **dentro** l'app.
 *
 * Prima rimandavano tutte a Sky Sport con quattro riquadri «apri la pagina
 * ufficiale». Il dato c'era: i widget `lmp-hero` e `lmp-lineup` lo pubblicano
 * allo stesso indirizzo dei widget classifica e calendario che l'app
 * interrogava già, e il `matchId` che serve per chiederli viaggiava nel
 * calendario senza che nessuno lo leggesse.
 *
 * ## Cosa resta dichiarato
 *
 * Prima del fischio d'inizio la formazione ufficiale **non esiste**: quella che
 * si vede è la probabile, e la scheda lo scrive. Non è una sfumatura: una
 * previsione presentata come formazione ufficiale è un dato falso, e per di
 * più smentibile un'ora dopo.
 */

const ETICHETTA_EVENTO: Record<string, string> = {
  GOAL: "Gol",
  YELLOW: "Ammonizione",
  RED: "Espulsione",
  SUB: "Sostituzione",
};

const SEGNO_EVENTO: Record<string, string> = {
  GOAL: "⚽",
  YELLOW: "🟨",
  RED: "🟥",
  SUB: "🔁",
};

function Intestazione({ detail }: { detail: MatchDetail }) {
  if (!detail.predicted) return null;
  return (
    <p className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
      La partita non è ancora cominciata: queste sono le <strong>probabili</strong> formazioni di
      Sky Sport, non quelle ufficiali. Possono cambiare fino al fischio d'inizio.
    </p>
  );
}

export function SchedaFormazione({ detail }: { detail: MatchDetail }) {
  if (!detail.home && !detail.away) {
    return (
      <EmptyState message="Formazioni non ancora pubblicate: i club le comunicano poco prima del fischio d'inizio." />
    );
  }
  return (
    <div className="space-y-4">
      <Intestazione detail={detail} />
      <div className="grid gap-4 lg:grid-cols-2">
        {detail.home && <Lato side={detail.home} casa />}
        {detail.away && <Lato side={detail.away} casa={false} />}
      </div>
    </div>
  );
}

/**
 * Il modulo, e come si traduce in linee di campo.
 *
 * Non è un doppione della scheda «Formazione»: là il campo è un dettaglio fra
 * numeri di maglia, panchina e allenatore; qui è la sola cosa, con i due
 * moduli affiancati per poterli confrontare.
 *
 * Le linee arrivano dalle cifre del modulo e valgono `[]` quando i conti non
 * tornano — è la stessa regola di `toLines` in `lineups.ts`: meglio un elenco
 * che un campo disegnato diverso da quello che la fonte ha pubblicato.
 */
export function SchedaModulo({ detail }: { detail: MatchDetail }) {
  const lati = [detail.home, detail.away].filter(Boolean);
  if (lati.length === 0 || lati.every((l) => !l!.formation)) {
    return (
      <EmptyState message="Modulo non ancora disponibile: viene pubblicato con le formazioni." />
    );
  }

  return (
    <div className="space-y-4">
      <Intestazione detail={detail} />
      <div className="grid gap-4 lg:grid-cols-2">
        {lati.map((side) => (
          <section
            key={side!.teamName}
            className="rounded-lg border border-border/60 bg-card/60 p-4"
          >
            <header className="flex items-center gap-2">
              {side!.logoUrl && (
                <img
                  src={side!.logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-6 w-6 object-contain"
                />
              )}
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide">
                {side!.teamName}
              </h3>
            </header>

            <p className="mt-2 font-heading text-4xl font-bold tabular-nums text-[hsl(var(--team-accent-text))]">
              {side!.formation ? [...side!.formation].join("-") : "—"}
            </p>

            {side!.lines.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {side!.lines.map((linea, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
                      {i === 0 ? "Porta" : `Linea ${i}`}
                    </span>
                    {linea.map((p) => (
                      <span
                        key={p.playerId ?? p.name}
                        className="rounded-full border border-[hsl(var(--team-accent))]/40 px-2 py-0.5 text-xs"
                      >
                        {p.surname || p.name}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Gli undici pubblicati non si dispongono su questo modulo: l'elenco completo è nella
                scheda Formazione.
              </p>
            )}

            {side!.manager && (
              <p className="mt-3 text-xs">
                <span className="font-heading uppercase tracking-wider text-muted-foreground">
                  Allenatore:{" "}
                </span>
                {side!.manager}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function RigaEvento({ e, casa }: { e: MatchEvent; casa: boolean }) {
  const etichetta = ETICHETTA_EVENTO[e.type] ?? e.type;
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2",
        casa ? "lg:mr-auto lg:w-[58%]" : "lg:ml-auto lg:w-[58%] lg:flex-row-reverse lg:text-right",
      )}
    >
      <span className="font-heading text-sm font-bold tabular-nums text-muted-foreground">
        {e.minute}'
      </span>
      <span aria-hidden="true">{SEGNO_EVENTO[e.type] ?? "•"}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{e.player}</span>
        <span className="block text-[11px] text-muted-foreground">
          {etichetta}
          {e.type === "SUB" && e.playerOut ? ` · esce ${e.playerOut}` : ""}
        </span>
      </span>
    </li>
  );
}

export function SchedaCronologia({ detail }: { detail: MatchDetail }) {
  if (detail.events.length === 0) {
    return (
      <EmptyState
        message={
          detail.score
            ? "La fonte non pubblica gol, cartellini o sostituzioni per questa partita."
            : "Nessun fatto da raccontare: la partita non è ancora cominciata."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {detail.events.map((e, i) => (
          <RigaEvento
            key={`${e.minute}-${e.type}-${e.player}-${i}`}
            e={e}
            casa={e.side === "home"}
          />
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Gol, cartellini e sostituzioni da Sky Sport. Non è una diretta testuale: sono i fatti della
        partita, non il racconto azione per azione.
      </p>
    </div>
  );
}
