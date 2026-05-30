/**
 * Normalizza un input data in un `Date` riferito al fuso UTC quando
 * la stringa ISO non contiene un offset esplicito (`Z` oppure
 * `+HH:MM`/`-HH:MM`). Tutti i provider che usiamo (Sky, Lega Serie A,
 * Jolpica, Pulselive, motogp.com) pubblicano gli orari in UTC: la
 * policy "naive = UTC" è più sicura del default JS che interpreterebbe
 * la stringa come ora locale del client.
 *
 * Ritorna `null` per input invalidi, vuoti o non parsabili.
 */
export function toRomeDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Se è una stringa ISO con parte time (contiene "T") senza offset,
  // forziamo l'interpretazione come UTC aggiungendo "Z".
  let normalized = trimmed;
  if (/T\d{2}:\d{2}/.test(trimmed) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    normalized = `${trimmed}Z`;
  }
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format UTC date string to Italian locale date */
export function formatDateIT(dateStr: string): string {
  const date = toRomeDate(dateStr);
  if (!date) return dateStr;
  try {
    const day = date.toLocaleDateString("it-IT", { day: "2-digit", timeZone: "Europe/Rome" });
    const month = date.toLocaleDateString("it-IT", { month: "2-digit", timeZone: "Europe/Rome" });
    const year = date.toLocaleDateString("it-IT", { year: "numeric", timeZone: "Europe/Rome" });
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Helper specializzato per le date Juventus: garantisce che ogni
 * stringa proveniente dal backend (Sky/Lega) sia normalizzata e
 * presentata sempre in fuso `Europe/Rome`, indipendentemente dal
 * fuso del client. Centralizza la formattazione per evitare drift
 * (vedi `scripts/check-rome-tz.mjs`).
 */
export function formatJuventusDateTime(
  input: string | Date | null | undefined
): { date: string; time: string; full: string } {
  const date = toRomeDate(input);
  if (!date) return { date: "—", time: "", full: "—" };
  const day = date.toLocaleDateString("it-IT", { day: "2-digit", timeZone: "Europe/Rome" });
  const month = date.toLocaleDateString("it-IT", { month: "2-digit", timeZone: "Europe/Rome" });
  const year = date.toLocaleDateString("it-IT", { year: "numeric", timeZone: "Europe/Rome" });
  const time = date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
  const dateStr = `${day}/${month}/${year}`;
  return { date: dateStr, time, full: `${dateStr} ${time}` };
}

function getDateTimestamp(dateStr?: string | null): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(dateStr).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function prioritizeNextUpcoming<T>(
  items: T[],
  getDate: (item: T) => string | undefined | null,
  isUpcomingCandidate: (item: T) => boolean = () => true,
  getEndDate?: (item: T) => string | undefined | null
): { items: T[]; highlightIndex: number } {
  const sorted = [...items].sort((a, b) => getDateTimestamp(getDate(a)) - getDateTimestamp(getDate(b)));
  const now = Date.now();

  // Un evento "in corso" (start <= now <= end) ha priorita' assoluta
  // e viene spostato in cima alla lista. Quando termina, torna nella
  // sua posizione cronologica naturale.
  const inProgressIndex = sorted.findIndex((item) => {
    const startTs = getDateTimestamp(getDate(item));
    if (!Number.isFinite(startTs) || startTs > now) return false;
    const endRaw = getEndDate?.(item);
    const endTs = endRaw
      ? getDateTimestamp(endRaw)
      : startTs + 3 * 60 * 60 * 1000; // fallback: finestra di 3h per eventi single-day
    return Number.isFinite(endTs) && now <= endTs;
  });

  if (inProgressIndex >= 0) {
    return {
      items: [
        sorted[inProgressIndex],
        ...sorted.slice(0, inProgressIndex),
        ...sorted.slice(inProgressIndex + 1),
      ],
      highlightIndex: 0,
    };
  }

  const nextIndex = sorted.findIndex((item) => {
    const timestamp = getDateTimestamp(getDate(item));
    return Number.isFinite(timestamp) && timestamp > now && isUpcomingCandidate(item);
  });

  if (nextIndex <= 0) {
    return { items: sorted, highlightIndex: nextIndex };
  }

  return {
    items: [...sorted.slice(nextIndex), ...sorted.slice(0, nextIndex)],
    highlightIndex: 0,
  };
}

/** Format UTC time string (HH:mm:ssZ) to Italian local time */
export function formatTimeIT(timeStr?: string | null, dateStr?: string): string {
  if (!timeStr) return "";
  try {
    const rawTime = timeStr.trim();
    // Policy "naive = UTC": se la stringa orario non contiene gia' un
    // offset (`Z` oppure `±HH:MM`), forziamo l'interpretazione come UTC
    // aggiungendo `Z`. Evita drift DST quando il provider invia
    // `HH:mm:ss` puro o quando manca `dateStr`.
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(rawTime);
    const normalizedTime = hasOffset ? rawTime : `${rawTime}Z`;
    const fullDate = dateStr
      ? `${dateStr}T${normalizedTime}`
      : `2026-01-01T${normalizedTime}`;
    const date = new Date(fullDate);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
  } catch {
    return timeStr;
  }
}

/** Format full datetime to Italian locale */
export function formatDateTimeIT(dateStr: string): string {
  // Usa `toRomeDate` per garantire che le stringhe ISO senza offset
  // (`naive`) vengano trattate come UTC e poi formattate sempre in
  // fuso `Europe/Rome`. Coerente con `formatJuventusDateTime` e
  // `formatTimeIT`.
  const date = toRomeDate(dateStr);
  if (!date) return dateStr;
  try {
    const day = date.toLocaleDateString("it-IT", { day: "2-digit", timeZone: "Europe/Rome" });
    const month = date.toLocaleDateString("it-IT", { month: "2-digit", timeZone: "Europe/Rome" });
    const year = date.toLocaleDateString("it-IT", { year: "numeric", timeZone: "Europe/Rome" });
    const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
    return `${day}/${month}/${year} ${time}`;
  } catch {
    return dateStr;
  }
}

/** Determine event status based on date */
export function getEventStatus(dateStr: string): "prossimo" | "in_corso" | "completato" {
  const eventDate = toRomeDate(dateStr);
  if (!eventDate) return "prossimo";
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < -3) return "completato";
  if (diffHours < 3 && diffHours > -3) return "in_corso";
  return "prossimo";
}

/**
 * Restituisce la data odierna in formato ISO `YYYY-MM-DD` calcolata nel
 * fuso `Europe/Rome`. Usato per allineare i range delle nuove uscite
 * streaming (Index + StreamingPage) al giorno italiano.
 */
export function todayRomeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Somma `days` (anche negativi) ad una data ISO `YYYY-MM-DD` operando in
 * UTC per evitare drift da DST. Ritorna sempre `YYYY-MM-DD`.
 */
export function addDaysISO(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calcola la differenza in giorni di calendario tra `dateIso`
 * (qualunque stringa parsabile da `Date`) e oggi nel fuso `Europe/Rome`.
 * Le ore vengono azzerate confrontando le date come `YYYY-MM-DD` in
 * timezone italiano, così "oggi" resta coerente per tutto il giorno.
 *
 * Ritorna:
 * - numero positivo se la data è nel futuro
 * - 0 se è oggi
 * - numero negativo se è già passata
 * - `null` se l'input non è una data valida
 */
export function daysUntilRome(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return null;

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayIso = fmt.format(new Date());
  const targetIso = fmt.format(parsed);

  const [ty, tm, td] = todayIso.split("-").map(Number);
  const [ry, rm, rd] = targetIso.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Formatta una durata espressa in minuti come "45 min" o "1h 25 min".
 * Ritorna stringa vuota per valori non finiti, negativi o zero.
 *
 * Esempi:
 * - `formatDuration(45)` -> "45 min"
 * - `formatDuration(60)` -> "1h"
 * - `formatDuration(85)` -> "1h 25 min"
 * - `formatDuration(0)` -> ""
 * - `formatDuration(NaN)` -> ""
 */
export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "";
  const rounded = Math.round(min);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? `${h}h` : `${h}h ${m} min`;
}

/**
 * Variante "parlata" di {@link formatDuration} pensata per `aria-label`
 * destinati a screen reader italiani. Espande ore/minuti con singolare e
 * plurale espliciti.
 *
 * Esempi:
 * - `formatDurationSpoken(45)` -> "45 minuti"
 * - `formatDurationSpoken(1)` -> "1 minuto"
 * - `formatDurationSpoken(60)` -> "1 ora"
 * - `formatDurationSpoken(120)` -> "2 ore"
 * - `formatDurationSpoken(65)` -> "1 ora e 5 minuti"
 * - `formatDurationSpoken(125)` -> "2 ore e 5 minuti"
 * - `formatDurationSpoken(0)` -> ""
 */
export function formatDurationSpoken(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "";
  const rounded = Math.round(min);
  if (rounded < 60) {
    return rounded === 1 ? "1 minuto" : `${rounded} minuti`;
  }
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const oraPart = h === 1 ? "1 ora" : `${h} ore`;
  if (m === 0) return oraPart;
  const minPart = m === 1 ? "1 minuto" : `${m} minuti`;
  return `${oraPart} e ${minPart}`;
}

/**
 * Formato relativo italiano per date recenti, pensato per metadati UI
 * tipo "pubblicato 2 giorni fa". Si appoggia a `toRomeDate` per la
 * normalizzazione "naive = UTC". Ritorna stringa vuota per input non
 * validi.
 *
 * Esempi:
 * - oggi -> "oggi"
 * - 1 giorno fa -> "ieri"
 * - 3 giorni fa -> "3 giorni fa"
 * - 14 giorni fa -> "2 settimane fa"
 * - 60 giorni fa -> "2 mesi fa"
 */
export function formatRelativeIT(input: string | Date | null | undefined): string {
  const date = toRomeDate(input);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return diffMin === 1 ? "1 minuto fa" : `${diffMin} minuti fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH === 1 ? "1 ora fa" : `${diffH} ore fa`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 0) return "oggi";
  if (diffD === 1) return "ieri";
  if (diffD < 7) return `${diffD} giorni fa`;
  if (diffD < 30) {
    const w = Math.floor(diffD / 7);
    return w === 1 ? "1 settimana fa" : `${w} settimane fa`;
  }
  if (diffD < 365) {
    const mo = Math.floor(diffD / 30);
    return mo === 1 ? "1 mese fa" : `${mo} mesi fa`;
  }
  const y = Math.floor(diffD / 365);
  return y === 1 ? "1 anno fa" : `${y} anni fa`;
}
