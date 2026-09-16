import type { LineupPlayer, LineupSide, Lineups } from "@/lib/api/schemas";
import { toNumber } from "@/lib/api/schemas";
import { formatFootballDateTime } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import RemoteImage from "./RemoteImage";

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
      <RemoteImage
        src={p.photoUrl}
        alt={p.name}
        className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover sm:h-9 sm:w-9"
        fallbackClassName="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9"
      />
      <span className="min-w-0 flex-1 truncate text-left text-[11px] leading-tight sm:text-xs">
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
      className="flex min-w-0 items-center gap-1.5 transition-colors hover:text-primary"
    >
      {contenuto}
    </a>
  ) : (
    <span className="flex min-w-0 items-center gap-1.5">{contenuto}</span>
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
    <section
      className="min-w-0 space-y-3 rounded-lg border border-border/60 bg-card/60 p-2 sm:p-4"
      aria-label={`Formazione ${side.teamName}`}
    >
      <header className="flex min-w-0 flex-col items-center gap-1 text-center">
        <RemoteImage
          src={side.logoUrl}
          alt={side.teamName}
          className="h-9 w-9 object-contain sm:h-11 sm:w-11"
          fallbackClassName="h-9 w-9 rounded-full sm:h-11 sm:w-11"
          decorative
        />
        <h3 className="w-full truncate font-heading text-sm font-bold uppercase tracking-wide sm:text-base">
          {side.teamName}
        </h3>
        <span className="text-[10px] text-muted-foreground sm:text-xs">
          {casa ? "In casa" : "In trasferta"}
        </span>
        {side.formation && (
          <span className="rounded-full border border-primary/40 px-2 py-0.5 font-heading text-[11px] tabular-nums">
            {[...side.formation].join("-")}
          </span>
        )}
      </header>

      {side.lines.length > 0 ? (
        <div className={cn("rounded-md border border-border/40 bg-muted/20 p-1.5", "space-y-1")}>
          {side.lines.flat().map((p) => (
            <Giocatore key={p.playerId ?? p.name} p={p} />
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

      <div className="min-w-0 space-y-1 pt-1 [&_p]:break-words">
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

      <div className="grid grid-cols-2 gap-2 sm:gap-4" data-testid="confronto-formazioni">
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
