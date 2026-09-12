import type { LineupPlayer, LineupSide, Lineups } from "@/lib/api/schemas";
import { toNumber } from "@/lib/api/schemas";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

/**
 * Le probabili formazioni delle due squadre.
 *
 * ## Due qualita' di dato, e si vedono diverse
 *
 * Gli undici hanno numero, foto e scheda: si mostrano come giocatori. Panchina,
 * indisponibili, squalificati e in dubbio sono **soltanto cognomi** — la fonte
 * non da' altro — e si mostrano come testo. Dare loro la stessa veste degli
 * undici prometterebbe un dettaglio che dietro non c'e'.
 *
 * ## «Probabili» e' scritto, non sottinteso
 *
 * Sono previsioni editoriali di Sky, non formazioni ufficiali. La fonte non
 * pubblica **quando** le ha aggiornate, quindi qui non compare nessun «ultimo
 * aggiornamento»: inventarne uno darebbe autorita' a una previsione.
 */
interface LineupsBoardProps {
  lineups: Lineups;
}

function Giocatore({ p }: { p: LineupPlayer }) {
  const numero = toNumber(p.shirtNumber);
  const etichetta = p.surname || p.name;
  const contenuto = (
    <>
      {p.photoUrl ? (
        <img
          src={p.photoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-9 w-9 rounded-full object-cover bg-muted"
        />
      ) : (
        <span className="h-9 w-9 rounded-full bg-muted" aria-hidden="true" />
      )}
      {/*
        `w-full` e non solo `max-w`: il nome deve poter **scendere** sotto i
        5.5rem, non solo restare sotto. Con la sola larghezza massima lo span
        valeva 88px anche quando il posto assegnato al giocatore ne misurava
        57, e undici nomi cosi' spingevano il campo fuori dallo schermo.
      */}
      <span className="w-full max-w-[5.5rem] truncate text-center text-[11px] leading-tight">
        {numero !== null && (
          <span className="font-heading text-muted-foreground tabular-nums">{numero} </span>
        )}
        {etichetta}
      </span>
    </>
  );

  return p.profileUrl ? (
    <a
      href={p.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 flex-1 flex-col items-center gap-1 transition-colors hover:text-primary"
    >
      {contenuto}
    </a>
  ) : (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-1">{contenuto}</span>
  );
}

/** Un elenco di soli cognomi. Niente foto, niente link: non ci sono. */
function ElencoCognomi({ titolo, nomi }: { titolo: string; nomi: string[] }) {
  if (nomi.length === 0) return null;
  return (
    <p className="text-xs">
      <span className="font-heading uppercase tracking-wider text-muted-foreground">
        {titolo}:{" "}
      </span>
      <span className="text-foreground/80">{nomi.join(", ")}</span>
    </p>
  );
}

/**
 * Un lato: modulo, campo, panchina, allenatore.
 *
 * Esportato perche' lo riusa anche la scheda «Formazione» del dettaglio
 * partita, dove il dato ha la stessa forma — ufficiale invece che probabile,
 * ma `LineupSide` e' lo stesso tipo. Due rendering separati dello stesso dato
 * sarebbero liberi di divergere, e diverge sempre quello che nessuno guarda.
 */
export function Lato({ side, casa }: { side: LineupSide; casa: boolean }) {
  return (
    // `min-w-0`: questa sezione e' un elemento di griglia, e un elemento di
    // griglia ha `min-width: auto`. Non potendo scendere sotto il proprio
    // min-content non si comprimeva — allargava la colonna oltre il
    // contenitore, e da li' l'intera pagina. Il sintomo si vedeva sul
    // documento, la causa era qui dentro.
    <section className="min-w-0 rounded-lg border border-border/60 bg-card/60 p-4 space-y-3">
      <header className="flex items-center gap-2">
        {side.logoUrl && (
          <img src={side.logoUrl} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
        )}
        <h3 className="font-heading text-base font-bold uppercase tracking-wide">
          {side.teamName}
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {casa ? "In casa" : "In trasferta"}
        </span>
        {side.formation && (
          <span className="rounded-full border border-primary/40 px-2 py-0.5 font-heading text-[11px] tabular-nums">
            {[...side.formation].join("-")}
          </span>
        )}
      </header>

      {side.lines.length > 0 ? (
        <div
          className={cn(
            "rounded-md border border-border/40 bg-[hsl(var(--muted))]/20 px-2 py-4",
            "flex flex-col gap-4",
          )}
        >
          {side.lines.map((linea, i) => (
            <div key={i} className="flex justify-around gap-1">
              {linea.map((p) => (
                <Giocatore key={p.playerId ?? p.name} p={p} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        // Il modulo non tornava con gli undici: meglio un elenco leggibile che
        // un campo disegnato con le linee sbagliate.
        <ul className="text-sm space-y-0.5">
          {side.startingLineup.map((p) => (
            <li key={p.playerId ?? p.name}>{p.name}</li>
          ))}
        </ul>
      )}

      <div className="space-y-1 pt-1">
        {side.manager && (
          <p className="text-xs">
            <span className="font-heading uppercase tracking-wider text-muted-foreground">
              Allenatore:{" "}
            </span>
            {side.manager}
          </p>
        )}
        <ElencoCognomi titolo="In panchina" nomi={side.substitutes} />
        <ElencoCognomi titolo="In dubbio" nomi={side.doubtful} />
        <ElencoCognomi titolo="Squalificati" nomi={side.disqualifieds} />
        <ElencoCognomi titolo="Indisponibili" nomi={side.unavailables} />
      </div>
    </section>
  );
}

export default function LineupsBoard({ lineups }: LineupsBoardProps) {
  const quando = lineups.date ? formatFootballDateTime(lineups.date) : null;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="font-heading text-sm uppercase tracking-widest text-primary">
          Probabili formazioni
        </p>
        {quando && (
          <p className="text-sm text-muted-foreground">
            {lineups.home?.teamName} - {lineups.away?.teamName} · {quando.full}
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {lineups.home && <Lato side={lineups.home} casa />}
        {lineups.away && <Lato side={lineups.away} casa={false} />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Previsioni editoriali di Sky Sport, non formazioni ufficiali: possono cambiare fino al
        fischio d'inizio. Panchina, squalificati e indisponibili sono pubblicati come soli cognomi.
      </p>
    </div>
  );
}
