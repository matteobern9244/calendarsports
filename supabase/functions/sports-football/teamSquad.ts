/**
 * La rosa di una squadra, letta dalla pagina `/calcio/squadre/{slug}/rosa`.
 *
 * Vive fuori da `index.ts` per la ragione di sempre: `index.ts` chiama
 * `Deno.serve` a livello di modulo, quindi importarlo da un test farebbe
 * partire un server. Qui dentro c'e' un test; il typecheck copre entrambi,
 * via `tsconfig.edge.json`.
 *
 * ## Cosa la fonte da' e cosa non da'
 *
 * Verificato dal vivo su Juventus, Napoli e Frosinone l'11 settembre 2026: la
 * tabella `ftbl__team-players-table` e' identica nelle tre, e per giocatore
 * porta numero, bandiera, nome, link alla scheda, eta', altezza e peso.
 *
 * **Non c'e' la data di nascita**: c'e' l'eta' in anni. Non la si ricava
 * all'indietro — una data calcolata da «29 anni» sarebbe precisa al giorno e
 * falsa. E **non ci sono le foto**: nella tabella ci sono solo bandiere.
 *
 * ## Le due forme che un parser ingenuo sbaglia
 *
 * Il **ruolo e' una riga-intestazione**, non una colonna. Si legge scorrendo
 * le righe in ordine e portandosi dietro il gruppo corrente.
 *
 * L'**allenatore chiude la stessa tabella** ma non ha una scheda atleta,
 * quindi il suo nome sta in uno `<span class="...ftbl__team-row__cta">` invece
 * che in un `<a>`. Cercare solo il link lo perde **in silenzio**: la rosa esce
 * completa e manca soltanto lui.
 */

/** Una riga della tabella, giocatore o allenatore che sia. */
export interface SquadRow {
  name: string;
  /** `null` quando la cella dice `-`, come per l'allenatore. */
  shirtNumber: number | null;
  /** Codice a tre lettere della bandiera (`ita`), `null` sul segnaposto. */
  countryCode: string | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Id della scheda atleta: lo stesso che usa il JSON delle formazioni. */
  playerId: string | null;
  profileUrl: string | null;
}

export interface SquadPlayer extends SquadRow {
  /**
   * L'etichetta del reparto **come la scrive Sky** (`Portieri`, `Difensori`…),
   * non un valore di un insieme chiuso deciso da noi.
   *
   * Un insieme chiuso sembra piu' rigoroso e qui sarebbe peggio: il giorno in
   * cui la fonte rinominasse un reparto, i suoi giocatori non avrebbero piu'
   * un ruolo valido e sparirebbero. Tenendo l'etichetta grezza, al massimo
   * cambia una scritta.
   */
  role: string;
}

export interface Squad {
  /** Nell'ordine della fonte, che e' gia' ordine di reparto. */
  players: SquadPlayer[];
  manager: SquadRow | null;
}

/**
 * Entita' HTML nei nomi propri: `D'Ambrosio` arriva come `D&#39;Ambrosio`.
 *
 * E' un doppione di quella in `index.ts`, e resta tale: importarla da li'
 * farebbe partire `Deno.serve` dentro il test, che e' proprio il motivo per
 * cui questo modulo esiste.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 16)));
}

/** `29 anni` -> 29. Assente o `-` -> `null`. */
function intBefore(text: string | undefined, unit: RegExp): number | null {
  if (!text) return null;
  const match = unit.exec(text);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

/** `1,94 m` -> 194 centimetri. La virgola e' decimale, non un separatore. */
function heightToCm(text: string | undefined): number | null {
  if (!text) return null;
  const match = /(\d+)[.,](\d{1,2})\s*m\b/.exec(text);
  if (!match) return null;
  const centesimi = match[2].padEnd(2, "0");
  return Number.parseInt(match[1], 10) * 100 + Number.parseInt(centesimi, 10);
}

function parseRow(row: string): SquadRow | null {
  // Il nome sta in un `<a>` per i giocatori e in uno `<span>` per
  // l'allenatore: entrambi portano la classe `ftbl__team-row__cta`.
  const cell = /<td class="ftbl__team-row__name">([\s\S]*?)<\/td>/.exec(row)?.[1];
  const name = cell
    ? decodeEntities(cell.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .trim()
    : "";
  if (!name) return null;

  const href = /href="(https:\/\/sport\.sky\.it\/calcio\/atleti\/[^"]+)"/.exec(row)?.[1] ?? null;

  // Solo il `src` di una bandiera vera: il segnaposto vive in `data-placeholder`
  // su **ogni** riga, e cercarlo senza distinguere darebbe a tutti lo stesso
  // paese inesistente.
  const countryCode =
    /src="[^"]*\/flags\/([a-z]{2,3})\.svg"/i.exec(row)?.[1]?.toLowerCase() ?? null;

  const numberCell = /<td class="ftbl__team-row__number">[\s\S]*?>([^<]*)</.exec(row)?.[1]?.trim();
  const data = [...row.matchAll(/<td class="ftbl__team-row__data">[\s\S]*?>([^<]*)</g)].map((m) =>
    m[1].trim(),
  );

  return {
    name,
    shirtNumber: intBefore(numberCell, /^(\d+)$/),
    countryCode,
    ageYears: intBefore(data[0], /(\d+)\s*anni/),
    heightCm: heightToCm(data[1]),
    weightKg: intBefore(data[2], /(\d+)\s*kg/),
    playerId: href ? (/\/(\d+)\/?$/.exec(href)?.[1] ?? null) : null,
    profileUrl: href,
  };
}

/**
 * Legge la rosa da una pagina squadra di Sky.
 *
 * Una pagina senza tabella — errore, redirect, formato cambiato — restituisce
 * una rosa **vuota**, non un'eccezione: chi chiama la traduce in «dato non
 * disponibile», che e' la verita', invece che in un 500 che non lo e'.
 */
export function parseSquad(html: string): Squad {
  const table = /<table class="ftbl__team-players-table"[\s\S]*?<\/table>/i.exec(html)?.[0];
  if (!table) return { players: [], manager: null };

  const players: SquadPlayer[] = [];
  let manager: SquadRow | null = null;
  let gruppo = "";

  for (const row of table.match(/<tr [\s\S]*?<\/tr>/g) ?? []) {
    const header = /class="ftbl__team-players-table__header-td"[^>]*>([^<]+)/.exec(row)?.[1];
    if (header) {
      gruppo = decodeEntities(header).replace(/\s+/g, " ").trim();
      continue;
    }
    if (!row.includes("ftbl__team-row__name")) continue;

    const parsed = parseRow(row);
    // Una riga illeggibile costa un giocatore, non la rosa: e' la stessa
    // scelta di `tolerantArray` sugli schemi del frontend.
    if (!parsed) continue;

    if (/allenatore/i.test(gruppo)) manager = parsed;
    else players.push({ ...parsed, role: gruppo });
  }

  return { players, manager };
}
