import { matchesTeam, type SerieATeam } from "@/lib/serieATeams";
import { toNumber, type FootballMatch, type FootballStandingRow } from "@/lib/api/schemas";
import { faseDaStato } from "@/lib/matchPhase";

/**
 * Le statistiche della squadra, ricavate da quello che l'app ha gia'.
 *
 * ## Perche' qui non c'e' nessuna fonte nuova
 *
 * La Fase 4 del piano prevedeva API-Football. Serve ancora, ma per le
 * statistiche **del singolo giocatore**: tutto quello che si legge in questo
 * modulo e' una derivazione della classifica Serie A e del calendario della
 * squadra, che le pagine gia' scaricano e che sono gia' verificati dal vivo.
 *
 * E' una differenza che conta oltre il risparmio di una chiamata: un dato
 * derivato non ha modi nuovi di rompersi. Se la classifica arriva, arrivano
 * anche queste; se non arriva, la sezione lo dichiara come ogni altra.
 *
 * ## Due conti che non vanno mescolati
 *
 * La classifica da' i totali **di campionato** e li da' gia' sommati: sono
 * quelli che si mostrano, perche' sono la verita' ufficiale della fonte.
 * Il calendario serve per cio' che la classifica non dice — l'andamento
 * giornata per giornata, e la divisione fra casa e trasferta — e per quello
 * vanno riletti i singoli risultati.
 *
 * Dal calendario si contano **solo le partite di Serie A**: la Coppa Italia e
 * la Champions si giocano davvero, ma non danno punti in campionato, e
 * sommarle produrrebbe un andamento che non corrisponde a nessuna classifica.
 */

/** Il nome con cui la nostra edge function etichetta le partite di campionato. */
export const COMPETIZIONE_CAMPIONATO = "Serie A";

/** Punti per esito, la regola dei tre punti. */
const PUNTI: Record<Esito, number> = { V: 3, N: 1, S: 0 };

/**
 * L'esito con le lettere che l'app mostra gia' altrove: `CalendarList`
 * colora `V` di verde e `S` di rosso leggendo le ultime partite dalla
 * classifica di Sky. Introdurre qui una terza lettera per la sconfitta
 * significherebbe due vocabolari nella stessa pagina.
 */
export type Esito = "V" | "N" | "S";

export interface Totali {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface KpiSquadra extends Totali {
  position: number | null;
  goalDiff: number;
  /**
   * Le medie sono `null` — non zero — quando le partite giocate sono zero.
   * A inizio stagione zero punti a partita e' una bugia con l'aria di un
   * dato: la squadra non ha una media, non ne ha una pessima.
   */
  pointsPerMatch: number | null;
  goalsForPerMatch: number | null;
  goalsAgainstPerMatch: number | null;
  winRate: number | null;
}

export interface MediaCampionato {
  pointsPerMatch: number;
  goalsForPerMatch: number;
  goalsAgainstPerMatch: number;
}

export interface PartitaGiocata {
  id: string;
  matchday: number | null;
  date: string | null;
  opponent: string;
  /** Vero se la squadra giocava in casa. Deciso sul nome, per uguaglianza esatta. */
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  esito: Esito;
  points: number;
}

/** Divide con la garanzia che il divisore sia positivo, altrimenti `null`. */
function media(totale: number, partite: number): number | null {
  return partite > 0 ? totale / partite : null;
}

function numero(value: unknown): number {
  return toNumber(value as number | string | null | undefined) ?? 0;
}

/**
 * I totali di campionato della squadra, dalla riga di classifica che la nomina.
 *
 * `matchesTeam` e non `includes`: in classifica il nome e' quello breve, ma
 * l'uguaglianza esatta e' la regola di tutto il progetto e qui ha lo stesso
 * caso limite di sempre — «Juventus Next Gen» contiene «Juventus».
 *
 * Ritorna `null` quando la squadra non compare: e' il caso vero di una
 * neopromossa assente da una classifica vecchia, e va detto invece di
 * mostrare una riga di zeri che sembra una squadra senza punti.
 */
export function kpiSquadra(
  standings: readonly FootballStandingRow[],
  team: SerieATeam,
): KpiSquadra | null {
  const riga = standings.find((r) => matchesTeam(r.team, team));
  if (!riga) return null;

  const played = numero(riga.played);
  const goalsFor = numero(riga.goalsFor);
  const goalsAgainst = numero(riga.goalsAgainst);
  const wins = numero(riga.wins);

  return {
    position: toNumber(riga.position),
    played,
    wins,
    draws: numero(riga.draws),
    losses: numero(riga.losses),
    goalsFor,
    goalsAgainst,
    // Ricalcolata invece di letta: `goalDiff` e' un campo scrapato come gli
    // altri, e una differenza che non corrisponde ai gol sarebbe visibile.
    goalDiff: goalsFor - goalsAgainst,
    points: numero(riga.points),
    pointsPerMatch: media(numero(riga.points), played),
    goalsForPerMatch: media(goalsFor, played),
    goalsAgainstPerMatch: media(goalsAgainst, played),
    winRate: media(wins, played),
  };
}

/**
 * La media del campionato, cioe' il metro di paragone.
 *
 * Un numero da solo non dice niente: 1,6 punti a partita e' molto o poco a
 * seconda dell'anno. Questa media si ricava dalle **venti righe** che la
 * classifica porta gia' con se', quindi il paragone e' con il campionato di
 * oggi e non con una soglia scritta a mano che invecchia.
 *
 * Le squadre con zero partite non entrano nel conto: a stagione non iniziata
 * abbasserebbero la media di tutti verso lo zero.
 */
export function mediaCampionato(standings: readonly FootballStandingRow[]): MediaCampionato | null {
  let partite = 0;
  let punti = 0;
  let fatti = 0;
  let subiti = 0;

  for (const riga of standings) {
    const played = numero(riga.played);
    if (played <= 0) continue;
    partite += played;
    punti += numero(riga.points);
    fatti += numero(riga.goalsFor);
    subiti += numero(riga.goalsAgainst);
  }
  if (partite === 0) return null;

  return {
    pointsPerMatch: punti / partite,
    goalsForPerMatch: fatti / partite,
    goalsAgainstPerMatch: subiti / partite,
  };
}

/**
 * Le partite di campionato gia' giocate, rilette dal punto di vista della
 * squadra.
 *
 * Tre filtri, e ognuno toglie qualcosa di diverso:
 *
 * - **la competizione**, perche' coppe e Champions non danno punti;
 * - **lo stato**, perche' una partita in corso non ha ancora un esito;
 * - **i due punteggi**, perche' la fonte li valorizza solo a partita finita e
 *   un `null` letto come zero inventerebbe uno 0-0 mai giocato.
 *
 * Il lato si decide sul **nome**, per uguaglianza esatta. Una partita che non
 * nomina la squadra da nessuno dei due lati viene scartata: attribuirla per
 * esclusione — «non e' in casa, quindi e' in trasferta» — ribalterebbe il
 * risultato di una partita che non la riguarda.
 */
export function partiteDiCampionato(
  matches: readonly FootballMatch[],
  team: SerieATeam,
): PartitaGiocata[] {
  const giocate: PartitaGiocata[] = [];

  for (const m of matches) {
    if (m.competition !== COMPETIZIONE_CAMPIONATO) continue;
    // Solo quello che la **fonte** dichiara concluso: le statistiche non si
    // costruiscono su una fase dedotta dall'orologio.
    if (faseDaStato(m.status) !== "finita") continue;
    const casa = toNumber(m.homeScore);
    const fuori = toNumber(m.awayScore);
    if (casa === null || fuori === null) continue;

    const inCasa = matchesTeam(m.homeTeam, team);
    const inTrasferta = matchesTeam(m.awayTeam, team);
    if (inCasa === inTrasferta) continue;

    const goalsFor = inCasa ? casa : fuori;
    const goalsAgainst = inCasa ? fuori : casa;
    const esito: Esito = goalsFor > goalsAgainst ? "V" : goalsFor === goalsAgainst ? "N" : "S";

    giocate.push({
      id: m.id,
      matchday: toNumber(m.matchday),
      date: m.date ?? null,
      opponent: inCasa ? m.awayTeam : m.homeTeam,
      home: inCasa,
      goalsFor,
      goalsAgainst,
      esito,
      points: PUNTI[esito],
    });
  }

  // L'ordine e' il senso stesso di «andamento»: la fonte consegna le partite
  // per competizione, e un accumulo sull'ordine di arrivo disegnerebbe una
  // curva che non e' mai accaduta. La data e' lo spareggio quando la giornata
  // manca o e' la stessa (i recuperi).
  return giocate.sort((a, b) => {
    const ga = a.matchday ?? Number.MAX_SAFE_INTEGER;
    const gb = b.matchday ?? Number.MAX_SAFE_INTEGER;
    if (ga !== gb) return ga - gb;
    return (a.date ?? "").localeCompare(b.date ?? "");
  });
}

export interface PuntoAndamento {
  /** Progressivo della partita giocata: 1, 2, 3… E' l'asse del grafico. */
  indice: number;
  matchday: number | null;
  opponent: string;
  esito: Esito;
  cumulati: number;
}

/**
 * I punti accumulati partita dopo partita.
 *
 * L'asse e' il **progressivo delle partite giocate**, non il numero di
 * giornata: con i recuperi le due cose divergono, e una squadra con una
 * partita in meno avrebbe un buco nel grafico che somiglia a un crollo. La
 * giornata resta nel dato, per l'etichetta.
 */
export function andamentoPunti(giocate: readonly PartitaGiocata[]): PuntoAndamento[] {
  let cumulati = 0;
  return giocate.map((m, i) => {
    cumulati += m.points;
    return {
      indice: i + 1,
      matchday: m.matchday,
      opponent: m.opponent,
      esito: m.esito,
      cumulati,
    };
  });
}

function totaliVuoti(): Totali {
  return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function somma(totali: Totali, m: PartitaGiocata): void {
  totali.played += 1;
  totali.goalsFor += m.goalsFor;
  totali.goalsAgainst += m.goalsAgainst;
  totali.points += m.points;
  if (m.esito === "V") totali.wins += 1;
  else if (m.esito === "N") totali.draws += 1;
  else totali.losses += 1;
}

/**
 * Casa e trasferta, che la classifica non separa.
 *
 * E' l'unica cosa che questo modulo calcola e che nessuna fonte pubblica gia'
 * fatta, ed e' anche la piu' leggibile: due squadre con gli stessi punti e un
 * rendimento casalingo opposto raccontano stagioni diverse.
 */
export function ripartizioneCasaTrasferta(giocate: readonly PartitaGiocata[]): {
  casa: Totali;
  trasferta: Totali;
} {
  const casa = totaliVuoti();
  const trasferta = totaliVuoti();
  for (const m of giocate) somma(m.home ? casa : trasferta, m);
  return { casa, trasferta };
}

/**
 * Le ultime `n` partite giocate, in ordine cronologico.
 *
 * `slice(-n)` e non `slice(0, n)`: la forma e' quella di adesso, e le prime
 * partite della stagione sono l'informazione meno utile che ci sia a marzo.
 */
export function formaRecente(giocate: readonly PartitaGiocata[], n = 5): PartitaGiocata[] {
  return giocate.slice(-n);
}
