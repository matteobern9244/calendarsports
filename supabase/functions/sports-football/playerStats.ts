/**
 * Le statistiche di un singolo giocatore, dalla sua scheda atleta su Sky.
 *
 * ## Perche' questa fonte e non API-Football
 *
 * Perche' questa c'e'. Interrogata con una chiave vera l'11 settembre 2026,
 * API-Football risponde `Free plans do not have access to this season, try from
 * 2022 to 2024`: il dato della stagione in corso costa. La scheda atleta di
 * Sky, che l'app gia' raggiunge — il parser della rosa ne estrae gia' il link —
 * lo pubblica gratis e aggiornato.
 *
 * Come le probabili formazioni, **non e' scraping**: la pagina porta un
 * `<script type="application/json">` e il lavoro e' leggere un JSON, non
 * indovinare un layout.
 *
 * ## La cosa da sapere prima di toccare questo file
 *
 * **La forma delle statistiche cambia con il ruolo.** Un portiere ha
 * `SavesMade`, `Cleansheets`, `GoalsConceded`, `PenaltiesSaved`; un giocatore
 * di movimento ha `Starts`, `Goals`, `Assists`, `KeyPasses`. Non e' che il
 * portiere abbia zero gol: il campo **non c'e'**, ed e' il motivo per cui qui
 * si restituisce un dizionario di quello che c'e' e non un oggetto a campi
 * fissi. Riempire di zeri i campi mancanti darebbe numeri falsi con l'aria di
 * dati veri.
 *
 * `seasonAndCompId` vale `"2026#21"`: anno e id competizione separati da un
 * cancelletto, **nello stesso spazio di id** che `index.ts` usa gia' — 21 e'
 * la Serie A, 5 la Champions.
 */

/** Le statistiche di un giocatore in una competizione e una stagione. */
export interface StatistichePerCompetizione {
  /** L'anno d'inizio, come lo scrive la fonte: `"2026"`. */
  seasonYear: string;
  /** Il nome esteso della stagione: `"2026/2027"`. */
  season: string;
  competitionId: string;
  competition: string;
  /**
   * Le voci presenti, per identificatore. **Un campo assente resta assente**:
   * chi legge deve distinguere «zero gol» da «questo ruolo non ha i gol».
   */
  stats: Record<string, number>;
  /**
   * Le coppie riuscito/sbagliato: passaggi, tiri, duelli. Restano coppie e non
   * diventano un totale, perche' 165 passaggi riusciti su 188 e 165 su 400
   * sono due partite diverse.
   */
  charts: { id: string; success: number; failure: number }[];
}

/** L'id con cui Sky identifica la Serie A, lo stesso di `index.ts`. */
const SERIE_A = "21";

function numero(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function testo(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Estrae il blocco JSON della pagina.
 *
 * Stessa forma delle probabili formazioni, e stesso motivo per cui una pagina
 * che non ce l'ha non e' un errore da propagare: e' una scheda che oggi non
 * pubblica statistiche, o una fonte che ha cambiato forma. In entrambi i casi
 * chi chiama lo dichiara con `dataSource: "unavailable"`.
 */
function bloccoJson(html: string): unknown {
  const match = html.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.warn("Blocco JSON della scheda atleta non leggibile:", e);
    return null;
  }
}

export function parsePlayerStats(html: string): StatistichePerCompetizione[] {
  const dati = bloccoJson(html);
  if (!dati || typeof dati !== "object") return [];
  const mappa = (dati as Record<string, unknown>).statisticsMap;
  if (!Array.isArray(mappa)) return [];

  const esito: StatistichePerCompetizione[] = [];

  for (const voce of mappa) {
    if (!voce || typeof voce !== "object") continue;
    const v = voce as Record<string, unknown>;

    // `"2026#21"`: senza il cancelletto non sappiamo ne' la stagione ne' la
    // competizione, e tenere la voce significherebbe non poterla ne' filtrare
    // ne' etichettare.
    const [seasonYear, competitionId] = testo(v.seasonAndCompId).split("#");
    if (!seasonYear || !competitionId) continue;

    const stats: Record<string, number> = {};
    const charts: StatistichePerCompetizione["charts"] = [];

    for (const item of Array.isArray(v.items) ? v.items : []) {
      if (!item || typeof item !== "object") continue;
      const i = item as Record<string, unknown>;

      if (i.type === "stat") {
        const valore = numero(i.value);
        const id = testo(i.id);
        // `value: null` non e' zero: e' una voce che la fonte non valorizza.
        if (id && valore !== null) stats[id] = valore;
        continue;
      }

      if (i.type === "chart" && Array.isArray(i.charts)) {
        for (const c of i.charts) {
          if (!c || typeof c !== "object") continue;
          const g = c as Record<string, unknown>;
          const success = numero(g.success);
          const failure = numero(g.failure);
          const id = testo(g.id);
          if (id && success !== null && failure !== null) charts.push({ id, success, failure });
        }
      }
    }

    esito.push({
      seasonYear,
      competitionId,
      season: testo(v.customSeasonName) || seasonYear,
      competition: testo(v.customCompetitionName) || competitionId,
      stats,
      charts,
    });
  }

  return esito;
}

/**
 * Tiene solo la stagione richiesta, con la Serie A davanti.
 *
 * Il filtro sulla stagione non e' un dettaglio di ordinamento: la stessa
 * scheda porta anche gli Europei del 2024, e mostrarli sotto il titolo della
 * stagione in corso sarebbe un dato vecchio presentato come attuale.
 */
export function statsPerStagione(
  voci: StatistichePerCompetizione[],
  season: string,
): StatistichePerCompetizione[] {
  return voci
    .filter((v) => v.seasonYear === season)
    .sort((a, b) => {
      if (a.competitionId === b.competitionId) return 0;
      if (a.competitionId === SERIE_A) return -1;
      if (b.competitionId === SERIE_A) return 1;
      return a.competition.localeCompare(b.competition, "it");
    });
}
