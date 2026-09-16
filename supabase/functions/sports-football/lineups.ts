/**
 * Le probabili formazioni, dalla pagina
 * `/calcio/serie-a/probabili-formazioni/{slug}`.
 *
 * **Non e' scraping di HTML.** La pagina porta un
 * `<script type="application/json" data-props="true">` con tutto dentro, ed e'
 * lo stesso formato che `index.ts` gia' legge dai widget Sky. Qui si estrae e
 * si normalizza: il resto del lavoro e' capire cosa quel JSON *non* dice.
 *
 * ## Due qualita' di dato nella stessa risposta
 *
 * `startingLineup` sono undici oggetti completi: numero, ruolo, nome, cognome,
 * id, foto, link. `substitutes`, `unavailables`, `disqualifieds` e
 * `potentialPlayers` sono invece **un solo elemento** con `id: null`,
 * `role: null` e tutti i cognomi in una stringa separata da virgola:
 *
 *     "fullName": "Grabara, Pinsoglio, Kelly, Gatti, Rugani, Sarr"
 *
 * Il contenitore ha la stessa forma, il contenuto no. Tenerli distinti qui
 * evita che l'interfaccia prometta una scheda giocatore che dietro non c'e'.
 *
 * E la categoria vuota **non e' un array vuoto**: e' un elemento con
 * `fullName: ""`. Senza normalizzarlo si mostrerebbe uno squalificato anonimo.
 */

export interface LineupPlayer {
  name: string;
  surname: string | null;
  shirtNumber: number | null;
  /** Come lo scrive la fonte, in inglese: `Goalkeeper`, `Defender`… */
  role: string | null;
  playerId: string | null;
  photoUrl: string | null;
  /** Ritratto stabile per id, usato se il file indicato dal widget non risponde. */
  fallbackPhotoUrl: string | null;
  profileUrl: string | null;
}

function clubHeadshotUrl(playerId: string | null): string | null {
  return playerId
    ? `https://static.sky.it/editorialstaticimages/bc29c89d1a3e47e0afbb38aed61e35b7/sport/headshots/calcio/club/${playerId}.png?im=Resize,width=270`
    : null;
}

export interface LineupSide {
  /** `seoName`: e' gia' lo slug del nostro dataset. */
  teamSlug: string | null;
  teamName: string;
  /** `"4231"`, come lo scrive la fonte. */
  formation: string | null;
  logoUrl: string | null;
  startingLineup: LineupPlayer[];
  /**
   * Gli undici divisi per linea di campo, portiere compreso.
   *
   * Ricavate dal **modulo**, non da un'ipotesi sui nomi dei ruoli: le cifre di
   * `formation` danno le linee dopo il portiere, e `formationPlace` va da 1 a
   * 11 nell'ordine giusto. Verificato su tutte e quaranta le formazioni
   * pubblicate l'11 settembre 2026. Se un giorno i conti non tornassero,
   * `lines` resta vuoto e l'interfaccia ripiega sull'elenco: meglio una lista
   * che un campo disegnato male.
   */
  lines: LineupPlayer[][];
  /** Solo cognomi: la fonte non da' altro per queste quattro categorie. */
  substitutes: string[];
  unavailables: string[];
  disqualifieds: string[];
  doubtful: string[];
  manager: string | null;
}

export interface Lineups {
  /** ISO **con `Z`**, quindi UTC esplicito: nessuna ambiguita' di fuso. */
  date: string | null;
  matchUrl: string | null;
  home: LineupSide | null;
  away: LineupSide | null;
}

const VUOTO: Lineups = { date: null, matchUrl: null, home: null, away: null };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Spezza `"Grabara, Pinsoglio, Kelly"`. Stringa vuota significa nessuno. */
function surnameList(raw: unknown): string[] {
  const elements = Array.isArray(raw) ? raw : [];
  return elements
    .flatMap((e: any) => String(e?.fullName ?? "").split(","))
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

export function toPlayer(raw: any): LineupPlayer {
  const playerId = str(raw?.id);
  return {
    name: String(raw?.fullName ?? raw?.surname ?? "").trim(),
    surname: str(raw?.surname),
    shirtNumber: num(raw?.jerseyNum),
    role: str(raw?.role),
    playerId,
    photoUrl: str(raw?.photoUrl) ?? str(raw?.fallbackPhotoUrl),
    fallbackPhotoUrl: clubHeadshotUrl(playerId),
    profileUrl: str(raw?.playerPageLink),
  };
}

/**
 * Divide gli undici nelle linee del modulo.
 *
 * Restituisce `[]` — non una divisione approssimata — quando i conti non
 * tornano: un campo disegnato con le linee sbagliate sarebbe una formazione
 * diversa da quella che la fonte ha pubblicato.
 */
export function toLines(players: LineupPlayer[], formation: string | null): LineupPlayer[][] {
  if (!formation || !/^\d{2,5}$/.test(formation) || players.length !== 11) return [];
  const sizes = [...formation].map(Number);
  if (sizes.some((n) => n <= 0) || sizes.reduce((a, b) => a + b, 0) + 1 !== 11) return [];

  const lines: LineupPlayer[][] = [[players[0]]];
  let i = 1;
  for (const size of sizes) {
    lines.push(players.slice(i, i + size));
    i += size;
  }
  return lines;
}

/**
 * Un lato, nella forma delle **probabili**.
 *
 * Esportata perche' la usa anche `matchDetail.ts`: il widget
 * `lmp-predicted-lineup-details` di una singola partita pubblica per lato la
 * stessa identica struttura di questa pagina. Riscriverla la' avrebbe creato
 * due letture dello stesso formato, libere di divergere.
 */
export function toSide(raw: any): LineupSide | null {
  const teamName = str(raw?.name);
  if (!teamName) return null;

  const lista = raw?.playerList ?? {};
  const startingLineup = (Array.isArray(lista.startingLineup) ? lista.startingLineup : [])
    // `formationPlace` e' il numero di posto, non l'ordine dell'array: e'
    // quello a dire chi e' il portiere e chi l'ultimo attaccante.
    .slice()
    .sort((a: any, b: any) => (num(a?.formationPlace) ?? 0) - (num(b?.formationPlace) ?? 0))
    .map(toPlayer)
    .filter((p: LineupPlayer) => p.name !== "");

  const formation = str(raw?.formation);
  return {
    teamSlug: str(raw?.seoName),
    teamName,
    formation,
    logoUrl: str(raw?.logoUrl),
    startingLineup,
    lines: toLines(startingLineup, formation),
    substitutes: surnameList(lista.substitutes),
    unavailables: surnameList(lista.unavailables),
    disqualifieds: surnameList(lista.disqualifieds),
    doubtful: surnameList(lista.potentialPlayers),
    manager: str(lista.manager?.fullName),
  };
}

export function parseLineups(html: string): Lineups {
  const block = /<script type="application\/json" data-props="true">([\s\S]*?)<\/script>/.exec(
    html,
  );
  if (!block) return VUOTO;

  let raw: any;
  try {
    raw = JSON.parse(block[1]);
  } catch (e) {
    console.error("Probabili formazioni: JSON non valido", e);
    return VUOTO;
  }

  return {
    date: str(raw?.date),
    matchUrl: str(raw?.ctaLmpUrl),
    home: toSide(raw?.home),
    away: toSide(raw?.away),
  };
}
