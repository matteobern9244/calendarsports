/** Format UTC date string to Italian locale date */
export function formatDateIT(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString("it-IT", { day: "2-digit", timeZone: "Europe/Rome" });
    const month = date.toLocaleDateString("it-IT", { month: "2-digit", timeZone: "Europe/Rome" });
    const year = date.toLocaleDateString("it-IT", { year: "numeric", timeZone: "Europe/Rome" });
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getDateTimestamp(dateStr?: string | null): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(dateStr).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function prioritizeNextUpcoming<T>(
  items: T[],
  getDate: (item: T) => string | undefined | null,
  isUpcomingCandidate: (item: T) => boolean = () => true
): { items: T[]; highlightIndex: number } {
  const sorted = [...items].sort((a, b) => getDateTimestamp(getDate(a)) - getDateTimestamp(getDate(b)));
  const now = Date.now();

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
    const fullDate = dateStr ? `${dateStr}T${timeStr}` : `2026-01-01T${timeStr}`;
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
  try {
    const date = new Date(dateStr);
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
  const now = new Date();
  const eventDate = new Date(dateStr);
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
