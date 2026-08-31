import { toRomeDate } from "@/lib/dateUtils";

/**
 * La griglia del mese e le date in fuso italiano di `CalendarPage`.
 *
 * Sta fuori dalla pagina perche' e' aritmetica di calendario: si sbaglia di un
 * giorno senza rumore, e si verifica senza montare un componente. Prima non
 * aveva nessun test.
 */

export const WEEKDAY_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;
export const MONTH_LABELS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export type RomeYMD = { y: number; m: number; d: number };

// I tre formatter della pagina vivono qui e non dentro le funzioni che li
// usano. Costruire un `Intl.DateTimeFormat` e' la parte cara dell'API:
// `toRomeYMD` ne costruiva uno per evento (~350 a mese) e `romeHHMM`, che
// passava da `toLocaleTimeString`, due per evento visibile.
const ROME_YMD_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ROME_HHMM_FMT = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
  hour12: false,
});

const ROME_DAY_HEADER_FMT = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome",
});

/** Estrae anno/mese/giorno della data in fuso `Europe/Rome`. */
export function toRomeYMD(date: Date): RomeYMD {
  const [y, m, d] = ROME_YMD_FMT.format(date).split("-").map(Number);
  return { y, m, d };
}

/** Chiave `YYYY-MM-DD` in fuso Rome per indicizzare gli eventi per giorno. */
export function romeDayKey(iso: string): string | null {
  const d = toRomeDate(iso);
  if (!d) return null;
  const { y, m, d: day } = toRomeYMD(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** HH:MM in fuso Rome dalla data ISO. */
export function romeHHMM(iso: string): string {
  const d = toRomeDate(iso);
  if (!d) return "";
  return ROME_HHMM_FMT.format(d);
}

/** HH:MM in fuso Rome da un `Date` gia' costruito (es. l'ultima sincronizzazione). */
export function romeHHMMFromDate(date: Date): string {
  return ROME_HHMM_FMT.format(date);
}

/** Costruisce la matrice 6x7 di giorni del mese visualizzato (lunedì=primo). */
export function buildMonthGrid(year: number, monthIndex0: number): RomeYMD[][] {
  // monthIndex0: 0..11
  const firstOfMonth = new Date(Date.UTC(year, monthIndex0, 1));
  // JS Date.getUTCDay(): 0=Dom..6=Sab. Trasformiamo in 0=Lun..6=Dom.
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const startUtc = new Date(Date.UTC(year, monthIndex0, 1 - firstWeekday));
  const weeks: RomeYMD[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: RomeYMD[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(
        Date.UTC(
          startUtc.getUTCFullYear(),
          startUtc.getUTCMonth(),
          startUtc.getUTCDate() + w * 7 + i,
        ),
      );
      row.push({
        y: day.getUTCFullYear(),
        m: day.getUTCMonth() + 1,
        d: day.getUTCDate(),
      });
    }
    weeks.push(row);
  }
  return weeks;
}

export function ymdKey(c: RomeYMD): string {
  return `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

export function formatDayHeaderIT(c: RomeYMD): string {
  // Costruiamo una data UTC a mezzogiorno per evitare drift cross-DST
  const d = new Date(Date.UTC(c.y, c.m - 1, c.d, 12, 0, 0));
  const s = ROME_DAY_HEADER_FMT.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
