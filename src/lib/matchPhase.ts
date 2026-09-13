import { toNumber } from "@/lib/api/schemas";
import { DURATA_EVENTO_PRESUNTA_MS, getDateTimestamp } from "@/lib/dateUtils";

/**
 * In che fase si trova una partita, e quale punteggio si puo' mostrare.
 *
 * ## Perche' esiste
 *
 * L'app conosceva due stati — «non ancora giocata» e `FullTime` — e tutto
 * quello che stava in mezzo ricadeva nel primo. Da li' discendevano i due
 * difetti fotografati durante Lazio-Milan: la card in testa che prometteva
 * «PROSSIMA PARTITA» mentre il chip accanto lampeggiava «IN DIRETTA · da 54m»,
 * e il punteggio che non si vedeva da nessuna parte.
 *
 * La stessa domanda veniva risolta in tre modi incompatibili: il confronto con
 * `"FullTime"` sparso in cinque punti, l'orologio dentro `EventCountdown`, e
 * un `status === "Live" || "InProgress"` nel dettaglio partita che cercava due
 * valori che la fonte non ha mai prodotto. Qui la risposta e' una sola.
 *
 * ## L'asimmetria fra la fonte e l'orologio
 *
 * La fonte sa cosa e' successo, l'orologio sa solo che ora e'. Quindi:
 *
 * - **la fonte decide**, quando parla;
 * - **l'orologio puo' solo spingere avanti**: se il calcio d'inizio e' passato
 *   e la fonte e' ancora ferma sul prepartita, la partita e' cominciata — ed
 *   e' esattamente il caso dello screenshot. Non puo' invece riportare
 *   indietro una partita che la fonte da' per finita: una sospesa al 20' e'
 *   finita, anche se l'orologio direbbe che si sta giocando;
 * - **l'orologio puo' frenare**: una partita non puo' essere in corso prima di
 *   cominciare, qualunque cosa dica uno stato sbagliato a monte;
 * - **l'orologio non decide mai un punteggio.** Sa quando si dovrebbe giocare,
 *   non quanti gol sono stati fatti. E' la regola che impedisce di trasformare
 *   lo zero che la fonte scrive in prepartita in uno 0-0 mai giocato.
 *
 * ## Lo specchio lato Deno
 *
 * Il vocabolario degli stati vive anche in
 * `supabase/functions/sports-football/matchStatus.ts`, perche' le edge function
 * girano su Deno e non possono importare da `src/`. Il guardiano che tiene
 * allineate le due copie e' `src/test/tooling/matchStatusMirror.test.ts`.
 */

export type FasePartita = "prepartita" | "in-corso" | "finita";

/** Chi ha deciso la fase: la fonte, o l'orologio come ripiego. */
export type OrigineFase = "fonte" | "orologio";

export interface FaseRisolta {
  fase: FasePartita;
  origine: OrigineFase;
}

/** Il minimo che serve per decidere: lo soddisfano sia `FootballMatch` sia il dettaglio. */
export interface PartitaConFase {
  status?: string | null;
  date?: string | null;
}

/** Lo stato con cui la fonte dichiara che la partita e' conclusa. */
const STATO_FINITA = "FullTime";

/**
 * Gli stati in cui la partita **non e' ancora cominciata**.
 *
 * Si enumera questa parte e non quella opposta: gli stati di gioco sono tanti
 * — primo tempo, intervallo, recuperi, supplementari, rigori — e un elenco che
 * ne dimenticasse uno nasconderebbe una partita in corso. Dimenticare invece
 * uno stato di attesa mostrerebbe uno 0-0 falso, che e' l'errore piu' grave
 * dei due.
 */
const NON_COMINCIATA = new Set(["PreMatch", "Postponed", "Cancelled"]);

/** La fase come la **dichiara** la fonte, o `null` quando la fonte tace. */
export function faseDaStato(status: string | null | undefined): FasePartita | null {
  if (!status) return null;
  if (status === STATO_FINITA) return "finita";
  return NON_COMINCIATA.has(status) ? "prepartita" : "in-corso";
}

/** Il calcio d'inizio e' gia' passato. */
function iniziata(match: PartitaConFase, now: number): boolean {
  return now >= getDateTimestamp(match.date);
}

/** Il calcio d'inizio e' passato da piu' di quanto un evento possa durare. */
function troppoTempoFa(match: PartitaConFase, now: number): boolean {
  return now >= getDateTimestamp(match.date) + DURATA_EVENTO_PRESUNTA_MS;
}

/** La fase da mostrare: la fonte se parla, l'orologio come ripiego. */
export function matchPhase(match: PartitaConFase, now: number): FaseRisolta {
  const dichiarata = faseDaStato(match.status);

  // La fine e' l'unica cosa che la fonte sa con certezza e l'orologio no.
  if (dichiarata === "finita") return { fase: "finita", origine: "fonte" };

  if (dichiarata === "in-corso") {
    return iniziata(match, now)
      ? { fase: "in-corso", origine: "fonte" }
      : { fase: "prepartita", origine: "orologio" };
  }

  if (dichiarata === "prepartita") {
    if (troppoTempoFa(match, now)) return { fase: "finita", origine: "orologio" };
    return iniziata(match, now)
      ? { fase: "in-corso", origine: "orologio" }
      : { fase: "prepartita", origine: "fonte" };
  }

  // La fonte tace: resta solo l'orologio. Senza data `getDateTimestamp`
  // risponde «mai», quindi si ricade su prepartita, che e' la fase che non
  // promette niente.
  if (troppoTempoFa(match, now)) return { fase: "finita", origine: "orologio" };
  return iniziata(match, now)
    ? { fase: "in-corso", origine: "orologio" }
    : { fase: "prepartita", origine: "orologio" };
}

export interface PartitaConPunteggio extends PartitaConFase {
  homeScore?: number | string | null;
  awayScore?: number | string | null;
}

/**
 * Il punteggio, **solo** quando la fonte dice che si e' giocato.
 *
 * Entrambi i numeri o nessuno: un «2 – ?» non e' un risultato parziale, e' un
 * risultato rotto.
 */
export function matchScore(
  match: PartitaConPunteggio,
  now: number,
): { home: number; away: number } | null {
  const dichiarata = faseDaStato(match.status);
  const giocato = dichiarata === "finita" || (dichiarata === "in-corso" && iniziata(match, now));
  if (!giocato) return null;
  const home = toNumber(match.homeScore);
  const away = toNumber(match.awayScore);
  return home === null || away === null ? null : { home, away };
}
