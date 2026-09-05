import { toRomeDate } from "@/lib/dateUtils";
import { STREAMING_FAMILIES, type TvFamilyPayload } from "@/hooks/useStreamingData";
import type { StreamingFamilyId } from "@/lib/api/sportsApi";

/**
 * L'aggregazione dei palinsesti della scheda «Stasera in TV».
 *
 * Sta qui e non nel componente perche' era verificabile solo montando
 * `TonightTvList` con due `vi.mock("@tanstack/react-query")`, e quei mock
 * descrivevano le nostre abitudini invece del contratto della libreria: uno
 * dei due implementava `useQueries` senza `combine`, e finche' nessuno la
 * usava sembrava fedele. Da qui la stessa logica si prova con dati veri,
 * senza fingere una libreria.
 */

export interface TvHighlight {
  family: StreamingFamilyId;
  channel: string;
  channelNumber?: number;
  time: string;
  startMs: number;
  durationMin: number;
  hourRome: number;
  minuteRome: number;
  /**
   * Orario di fine programma formattato `HH:mm` in fuso Europe/Rome.
   * Stringa vuota quando `hasExplicitEnd === false`: in quel caso non
   * mostriamo nulla per non inventare un orario non comunicato dalla
   * fonte.
   */
  endTime: string;
  /**
   * Minuti totali dalla mezzanotte Europe/Rome dell'orario di fine
   * programma. Per programmi che attraversano la mezzanotte (es. start
   * 23:30, end 01:15) viene normalizzato aggiungendo 24*60 in modo che
   * `endMinutesFromMidnight > startMinutes` sia sempre vero. Cosi' il
   * test di overlap con la finestra di prima serata e' un semplice
   * confronto numerico, senza casi speciali per il wrap.
   */
  endMinutesFromMidnight: number;
  /**
   * `true` quando la fonte ha fornito un orario di fine reale per il
   * programma. Quando `false` significa che `endMinutesFromMidnight` e
   * `durationMin` sono solo stime: il programma viene mostrato per
   * trasparenza ma annotato come "dati incompleti" e indirizzato alla
   * Guida TV ufficiale.
   */
  hasExplicitEnd: boolean;
  title: string;
  genre?: string;
}

/**
 * Un formatter solo per tutta la scheda. Costruire un
 * `Intl.DateTimeFormat` e' la parte cara dell'API (la `format` successiva
 * e' quasi gratis): qui viene chiamato due volte per programma, su tutti
 * i canali di cinque famiglie.
 */
const TV_TIME_FMT = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Prima serata italiana: dalle 21:00 incluse alle 22:59 incluse.
// I programmi che iniziano alle 23:00 o dopo appartengono alla
// seconda serata e non devono comparire nella scheda Home.
export const PRIME_TIME_START_MIN = 21 * 60; // 21:00
export const PRIME_TIME_END_EXCLUSIVE_MIN = 23 * 60; // 23:00 (escluso)

/**
 * Aggrega i palinsesti delle cinque famiglie in righe pronte per la
 * tabella, e riporta lo stato di attesa aggregato.
 *
 * Vive fuori dal componente perche' e' la `combine` di `useQueries`:
 * TanStack Query la riesegue solo quando cambiano i risultati **o**
 * quando cambia il riferimento della funzione, e ne condivide
 * strutturalmente l'output. Una funzione definita dentro il componente
 * sarebbe nuova a ogni render e non memoizzerebbe niente: era il difetto
 * della `useMemo(..., [tvQueries])` che c'era prima, visto che
 * `useQueries` senza `combine` restituisce un array nuovo ogni volta.
 */
/** Il minimo che serve di un risultato React Query: niente altro va importato. */
export interface TvQueryResult {
  data?: TvFamilyPayload;
  isPending: boolean;
}

export function combineTvHighlights(results: TvQueryResult[]) {
  const rows: TvHighlight[] = [];
  results.forEach((q, idx) => {
    const fam = STREAMING_FAMILIES[idx].id;
    const data = q.data;
    if (!data?.programsAvailable) return;
    for (const ch of data.channels ?? []) {
      // In home limitiamo le famiglie ai canali principali per non
      // saturare la scheda Stasera in TV.
      if (fam === "rai" && ch.id !== "rai-1" && ch.id !== "rai-2") continue;
      if (fam === "mediaset" && ch.id !== "canale-5" && ch.id !== "italia-1") continue;
      for (const p of ch.programs) {
        // Tutti gli orari sono normalizzati via `toRomeDate`: gli ISO
        // "naive" senza offset (es. "2026-04-21T20:30:00") vengono
        // trattati come UTC, in linea con la policy condivisa con le
        // pagine Juventus/F1/MotoGP. Senza questa normalizzazione il
        // client interpreterebbe la stringa come ora locale, con drift
        // visibile per utenti fuori dal fuso italiano e in DST.
        const d = toRomeDate(p.start);
        if (!d) continue;
        const hhmm = TV_TIME_FMT.format(d);
        const [hStr, mStr] = hhmm.split(":");
        const hasExplicitEnd = Boolean(p.end);
        const endDate = hasExplicitEnd ? toRomeDate(p.end) : null;
        // Quando la fonte non fornisce l'orario di fine assumiamo una
        // durata "open-ended" pari alla finestra di prima serata: il
        // programma e' candidato per la visualizzazione purche' parta
        // prima delle 23:00 (vedi overlapsPrimeWindow piu' in basso).
        // La durata mostrata in cella resta pero' 0 cosi' l'utente non
        // legge una durata inventata.
        const endMs = endDate ? endDate.getTime() : d.getTime() + 24 * 60 * 60 * 1000; // sentinel "fine ignota"
        const durationMin = endDate ? Math.max(0, Math.round((endMs - d.getTime()) / 60000)) : 0;
        // endMs e' un timestamp in millisecondi, non una stringa ISO: qui non
        // c'e' nessuna interpretazione di fuso da sbagliare.
        // @tz-ignore
        const endHHMM = TV_TIME_FMT.format(new Date(endMs));
        const [endHStr, endMStr] = endHHMM.split(":");
        const startMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
        let endMinutesFromMidnight = parseInt(endHStr, 10) * 60 + parseInt(endMStr, 10);
        // Normalizza il wrap dopo mezzanotte: se la fine cade lo stesso
        // giorno o prima dell'inizio (es. start 23:30, end 01:15)
        // aggiungiamo 24h in modo che il confronto con la finestra di
        // prima serata resti monotono.
        if (endMinutesFromMidnight <= startMinutes) {
          endMinutesFromMidnight += 24 * 60;
        }
        rows.push({
          family: fam,
          channel: ch.name,
          channelNumber: ch.number ?? undefined,
          time: hhmm,
          startMs: d.getTime(),
          durationMin,
          hourRome: parseInt(hStr, 10),
          minuteRome: parseInt(mStr, 10),
          endTime: hasExplicitEnd ? endHHMM : "",
          endMinutesFromMidnight,
          hasExplicitEnd,
          title: p.title,
          genre: p.genre ?? undefined,
        });
      }
    }
  });
  return { highlights: rows, isPending: results.some((q) => q.isPending) };
}

/**
 * Il programma tocca la fascia di prima serata.
 *
 * Quando la fonte non da' l'orario di fine basta che cominci prima delle
 * 23:00: e' meglio mostrarlo annotato come incompleto che nasconderlo,
 * perche' l'assenza del dato e' della fonte, non del palinsesto.
 */
export function overlapsPrimeWindow(h: TvHighlight): boolean {
  const startMin = h.hourRome * 60 + h.minuteRome;
  if (!h.hasExplicitEnd) {
    return startMin < PRIME_TIME_END_EXCLUSIVE_MIN;
  }
  return startMin < PRIME_TIME_END_EXCLUSIVE_MIN && h.endMinutesFromMidnight > PRIME_TIME_START_MIN;
}

/**
 * Quanti minuti della fascia il programma copre davvero. E' il criterio con
 * cui si sceglie il programma principale di ogni canale: vince chi ne copre
 * di piu'.
 */
export function primeWindowOverlapMinutes(h: TvHighlight): number {
  const startMin = h.hourRome * 60 + h.minuteRome;
  const overlapStart = Math.max(startMin, PRIME_TIME_START_MIN);
  const overlapEnd = Math.min(h.endMinutesFromMidnight, PRIME_TIME_END_EXCLUSIVE_MIN);
  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Soglia oltre la quale un programma e' il "vero" programma di prima
 * serata: calcio 100+, fiction 90+, film 100+, news show 40+. I TG
 * regionali, sui trenta minuti, restano sotto.
 */
const MIN_DURATION = 40;

export interface PrimeTimeSelection {
  /** `"all"` oppure l'id di una famiglia. */
  familyFilter: string;
  /** Posizione di ogni famiglia nell'ordine di presentazione. */
  familyOrder: Record<string, number>;
}

/**
 * Un solo programma per canale: quello che occupa davvero la prima
 * serata. Stava in una `useMemo` dentro `TonightTvList`, cioe' dove i
 * suoi criteri — la soglia, i tre tie-break, la chiave famiglia+canale —
 * non erano verificabili senza montare il componente e fingere React
 * Query.
 *
 * A parita' di minuti coperti l'ordine dei criteri conta: prima chi
 * supera `MIN_DURATION`, poi la durata, poi l'inizio piu' basso, che
 * serve solo a rendere il risultato indipendente dall'ordine in
 * ingresso.
 */
export function selectPrimeTimeHighlights(
  highlights: TvHighlight[],
  { familyFilter, familyOrder }: PrimeTimeSelection,
): TvHighlight[] {
  const pool =
    familyFilter === "all" ? highlights : highlights.filter((r) => r.family === familyFilter);

  const byChannel = new Map<string, TvHighlight>();
  for (const h of pool) {
    if (!overlapsPrimeWindow(h)) continue;
    const key = `${h.family}|${h.channel}`;
    const existing = byChannel.get(key);
    if (!existing) {
      byChannel.set(key, h);
      continue;
    }
    const hOverlap = primeWindowOverlapMinutes(h);
    const existingOverlap = primeWindowOverlapMinutes(existing);
    if (hOverlap !== existingOverlap) {
      if (hOverlap > existingOverlap) byChannel.set(key, h);
      continue;
    }
    const hIsMain = h.durationMin >= MIN_DURATION;
    const existingIsMain = existing.durationMin >= MIN_DURATION;
    if (hIsMain !== existingIsMain) {
      if (hIsMain) byChannel.set(key, h);
      continue;
    }
    if (h.durationMin !== existing.durationMin) {
      if (h.durationMin > existing.durationMin) byChannel.set(key, h);
      continue;
    }
    if (h.startMs < existing.startMs) byChannel.set(key, h);
  }

  return Array.from(byChannel.values()).sort((a, b) => {
    const fa = familyOrder[a.family] - familyOrder[b.family];
    if (fa !== 0) return fa;
    const cn = (a.channelNumber ?? 9999) - (b.channelNumber ?? 9999);
    if (cn !== 0) return cn;
    return a.startMs - b.startMs;
  });
}
