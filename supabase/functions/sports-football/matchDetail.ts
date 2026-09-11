/**
 * Il dettaglio di **una partita**: risultato, formazioni, modulo, cronologia.
 *
 * ## Da dove viene, e perche' non costa una ricerca
 *
 * Da due widget di Sky, `lmp-hero` e `lmp-lineup`, all'indirizzo
 * `sport.sky.it/football/{widget}/{matchId}/widget.html` — lo stesso schema dei
 * widget classifica e calendario che `index.ts` gia' interroga, e lo stesso
 * `<script type="application/json" data-props="true">` di sempre.
 *
 * Il `matchId` **non va cercato**: il widget del calendario lo pubblica gia'
 * come `id` di ogni partita, e l'azione `calendar` lo porta avanti come
 * `skyMatchId`. Senza quel campo sarebbe servito scaricare la pagina della
 * partita — 250 KB — solo per leggere un numero.
 *
 * ## Prima e dopo il fischio d'inizio sono due cose diverse
 *
 * A partita giocata `lmp-lineup` da' gli undici **veri**, il modulo, i gol con
 * il minuto, i cartellini, le sostituzioni e l'arbitro.
 *
 * Prima, lo stesso widget risponde `PreMatch` con **zero giocatori**. Non e' un
 * guasto: la formazione ufficiale non esiste ancora. In quel caso si ripiega
 * sul widget delle **probabili**, e la differenza viene dichiarata con
 * `predicted: true` — mostrare una previsione senza dirlo sarebbe spacciarla
 * per un fatto.
 *
 * ## La cronologia e' l'unica cosa che costruiamo noi
 *
 * La fonte non pubblica una cronologia: pubblica tre elenchi separati per lato
 * — `goals`, `scorersCards`, `substitution` — e dentro ci mette gli **id** dei
 * giocatori, non i nomi. Fonderli e risolvere gli id sugli undici e sulla
 * panchina e' il lavoro di `buildMatchDetail`.
 */

import { toPlayer, toSide, toLines, type LineupPlayer, type LineupSide } from "./lineups.ts";

export interface Marcatore {
  player: string;
  minute: number;
}

export interface HeroSide {
  name: string;
  logoUrl: string | null;
  goal: number | null;
  scorers: Marcatore[];
}

export interface Hero {
  matchId: string | null;
  status: string | null;
  date: string | null;
  venue: string | null;
  competition: string | null;
  round: string | null;
  home: HeroSide;
  away: HeroSide;
}

/** Un lato nella forma **ufficiale**: la panchina qui e' fatta di giocatori. */
export interface OfficialSide {
  teamName: string;
  logoUrl: string | null;
  formation: string | null;
  startingLineup: LineupPlayer[];
  lines: LineupPlayer[][];
  substitutes: LineupPlayer[];
  manager: string | null;
  goals: { id: string | null; minutes: number | null; type: string | null }[];
  cards: { id: string | null; minutes: number | null; type: string | null }[];
  substitutions: {
    playerIdIn: string | null;
    playerIdOut: string | null;
    minutes: number | null;
  }[];
}

export interface OfficialLineup {
  status: string | null;
  referee: string | null;
  home: OfficialSide;
  away: OfficialSide;
}

export type TipoEvento = "GOAL" | "YELLOW" | "RED" | "SUB";

export interface EventoPartita {
  minute: number;
  type: TipoEvento;
  side: "home" | "away";
  player: string;
  /** Solo per le sostituzioni: chi esce. */
  playerOut?: string;
}

export interface MatchDetail {
  status: string | null;
  date: string | null;
  venue: string | null;
  competition: string | null;
  round: string | null;
  referee: string | null;
  score: { home: number; away: number } | null;
  /** Vero quando la formazione e' una **probabile**, non quella ufficiale. */
  predicted: boolean;
  home: LineupSide | null;
  away: LineupSide | null;
  events: EventoPartita[];
}

const VUOTO: MatchDetail = {
  status: null,
  date: null,
  venue: null,
  competition: null,
  round: null,
  referee: null,
  score: null,
  predicted: false,
  home: null,
  away: null,
  events: [],
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Lo stato con cui la fonte dice che la partita **non e' ancora cominciata**.
 *
 * Serve perche' prima del fischio d'inizio `lmp-hero` pubblica `goal: 0` per
 * entrambe le squadre, e quello zero non e' un risultato: e' l'assenza di un
 * risultato. La fonte non ha un campo per distinguerli, e letto come punteggio
 * fa scrivere «Risultato finale 0-0» su una partita che nessuno ha giocato.
 *
 * Il confronto e' sul **solo** stato che significa «non iniziata», non su un
 * elenco di stati «in corso»: gli stati di gioco sono tanti — primo tempo,
 * intervallo, recuperi, supplementari — e un elenco che ne dimenticasse uno
 * nasconderebbe il risultato di una partita in corso. Dimenticare invece un
 * altro stato di attesa mostrerebbe uno 0-0 falso, ed e' l'errore piu' grave
 * dei due; per questo qui si accetta anche uno stato **assente** come «non
 * iniziata».
 */
const NON_COMINCIATA = "PreMatch";

/** Il blocco JSON del widget, o `null`. Stessa forma di `parseLineups`. */
function blocco(html: string): any {
  const m = /<script type="application\/json" data-props="true">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    console.error("Widget partita: JSON non valido", e);
    return null;
  }
}

function heroSide(raw: any): HeroSide {
  const scoreboard = Array.isArray(raw?.scoreboard) ? raw.scoreboard : [];
  return {
    name: str(raw?.name) ?? "",
    logoUrl: str(raw?.logoUrl),
    goal: num(raw?.goal),
    // `scoreboard` porta i marcatori **con il nome**, che e' l'unico posto in
    // cui la fonte li scrive per esteso invece che per id.
    scorers: scoreboard
      .filter((s: any) => s?.type === "GOAL")
      .map((s: any) => ({ player: str(s?.player) ?? "", minute: num(s?.minute) ?? 0 }))
      .filter((s: Marcatore) => s.player !== ""),
  };
}

export function parseHero(html: string): Hero | null {
  const dati = blocco(html);
  const m = dati?.match;
  if (!m) return null;
  return {
    matchId: str(m.matchId),
    status: str(m.status),
    date: str(m.date),
    venue: str(m.venue),
    competition: str(m.customCompetitionName),
    round: str(m.round),
    home: heroSide(m.home),
    away: heroSide(m.away),
  };
}

function officialSide(raw: any): OfficialSide {
  const lista = raw?.playerList ?? {};
  const startingLineup = (Array.isArray(lista.startingLineup) ? lista.startingLineup : [])
    .slice()
    .sort((a: any, b: any) => (num(a?.formationPlace) ?? 0) - (num(b?.formationPlace) ?? 0))
    .map(toPlayer)
    .filter((p: LineupPlayer) => p.name !== "");

  const formation = str(raw?.formation);
  return {
    teamName: str(raw?.name) ?? "",
    logoUrl: str(raw?.logoUrl),
    formation,
    startingLineup,
    lines: toLines(startingLineup, formation),
    // A partita giocata la panchina e' fatta di oggetti interi, non della
    // stringa di cognomi delle probabili: tenerla come testo perderebbe
    // numero, foto e link proprio dove per la prima volta ci sono.
    substitutes: (Array.isArray(lista.substitutes) ? lista.substitutes : [])
      .map(toPlayer)
      .filter((p: LineupPlayer) => p.name !== ""),
    manager: str(lista.manager?.fullName),
    goals: Array.isArray(raw?.goals) ? raw.goals.map(evento) : [],
    cards: Array.isArray(raw?.scorersCards) ? raw.scorersCards.map(evento) : [],
    substitutions: (Array.isArray(raw?.substitution) ? raw.substitution : []).map((s: any) => ({
      playerIdIn: str(s?.playerIdIn),
      playerIdOut: str(s?.playerIdOut),
      minutes: num(s?.minutes),
    })),
  };
}

function evento(raw: any) {
  return { id: str(raw?.id), minutes: num(raw?.minutes), type: str(raw?.type) };
}

export function parseOfficialLineup(html: string): OfficialLineup | null {
  const mf = blocco(html)?.matchFormations;
  if (!mf) return null;
  const arbitri = Array.isArray(mf.referees) ? mf.referees : [];
  return {
    status: str(mf.status),
    referee: str(arbitri[0]?.fullName),
    home: officialSide(mf.home),
    away: officialSide(mf.away),
  };
}

/** Da `OfficialSide` alla forma comune con le probabili, che la UI gia' sa rendere. */
function comeLineupSide(s: OfficialSide): LineupSide {
  return {
    teamSlug: null,
    teamName: s.teamName,
    formation: s.formation,
    logoUrl: s.logoUrl,
    startingLineup: s.startingLineup,
    lines: s.lines,
    // La panchina ufficiale e' fatta di giocatori interi; qui viaggia come
    // elenco di nomi perche' e' la forma che la scheda «Formazione» rende gia'.
    substitutes: s.substitutes.map((p) => p.name),
    unavailables: [],
    disqualifieds: [],
    doubtful: [],
    manager: s.manager,
  };
}

/**
 * Risolve un id giocatore in un nome, cercando fra undici e panchina.
 *
 * Torna `null` — non l'id — quando non lo trova: un numero al posto di un nome
 * in una cronologia e' peggio di una riga che manca, perche' sembra un dato.
 */
function nomeDi(id: string | null, lato: OfficialSide): string | null {
  if (!id) return null;
  const tutti = [...lato.startingLineup, ...lato.substitutes];
  return tutti.find((p) => p.playerId === id)?.name ?? null;
}

function tipoCarta(raw: string | null): TipoEvento | null {
  if (raw === "YELLOW") return "YELLOW";
  if (raw === "RED" || raw === "RED_CARD" || raw === "SECOND_YELLOW") return "RED";
  return null;
}

function eventiDiLato(lato: OfficialSide, side: "home" | "away"): EventoPartita[] {
  const esito: EventoPartita[] = [];

  for (const g of lato.goals) {
    const player = nomeDi(g.id, lato);
    if (g.minutes === null || !player) continue;
    esito.push({ minute: g.minutes, type: "GOAL", side, player });
  }
  for (const c of lato.cards) {
    const tipo = tipoCarta(c.type);
    const player = nomeDi(c.id, lato);
    if (c.minutes === null || !tipo || !player) continue;
    esito.push({ minute: c.minutes, type: tipo, side, player });
  }
  for (const s of lato.substitutions) {
    const entra = nomeDi(s.playerIdIn, lato);
    const esce = nomeDi(s.playerIdOut, lato);
    if (s.minutes === null || !entra) continue;
    esito.push({
      minute: s.minutes,
      type: "SUB",
      side,
      player: entra,
      playerOut: esce ?? undefined,
    });
  }

  return esito;
}

/**
 * Mette insieme i due widget in una cosa sola.
 *
 * L'ordine delle scelte conta: la formazione **ufficiale** vince sempre sulle
 * probabili, e si ripiega su queste solo quando la prima non ha giocatori.
 * L'inverso — probabili quando ci sono — mostrerebbe una previsione accanto a
 * un risultato gia' scritto.
 */
export function buildMatchDetail(input: {
  hero: Hero | null;
  official: OfficialLineup | null;
  predictedHtml: string | null;
}): MatchDetail {
  const { hero, official, predictedHtml } = input;
  const ufficialeDisponibile = Boolean(official && official.home.startingLineup.length > 0);

  let home: LineupSide | null = null;
  let away: LineupSide | null = null;
  let predicted = false;

  if (ufficialeDisponibile && official) {
    home = comeLineupSide(official.home);
    away = comeLineupSide(official.away);
  } else if (predictedHtml) {
    // Il widget delle probabili della partita: `matchList[0]`, con i due lati
    // nella stessa forma della pagina per squadra — per questo `toSide` vive
    // in `lineups.ts` ed e' esportata invece di essere riscritta qui.
    const raw = blocco(predictedHtml);
    const partita = Array.isArray(raw?.matchList) ? raw.matchList[0] : null;
    if (partita) {
      home = toSide(partita.home);
      away = toSide(partita.away);
      predicted = Boolean(home || away);
    }
  }

  const status = hero?.status ?? official?.status ?? null;
  const cominciata = status !== null && status !== NON_COMINCIATA;
  const gol = hero && cominciata ? { home: hero.home.goal, away: hero.away.goal } : null;
  const score =
    gol && gol.home !== null && gol.away !== null ? { home: gol.home, away: gol.away } : null;

  const events = official
    ? [...eventiDiLato(official.home, "home"), ...eventiDiLato(official.away, "away")].sort(
        (a, b) => a.minute - b.minute,
      )
    : [];

  return {
    ...VUOTO,
    status,
    date: hero?.date ?? null,
    venue: hero?.venue ?? null,
    competition: hero?.competition ?? null,
    round: hero?.round ?? null,
    referee: official?.referee ?? null,
    score,
    predicted,
    home,
    away,
    events,
  };
}
