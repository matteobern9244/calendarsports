export const ROME_TIME_ZONE = 'Europe/Rome';

const ISO_TIME_RE = /T\d{2}:\d{2}/;
const EXPLICIT_OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

const ROME_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const ROME_TIME_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const ROME_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROME_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const ROME_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('it-IT', {
  timeZone: ROME_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

/**
 * Normalizza le date evento del dispatcher con la stessa policy della UI:
 * le stringhe ISO con orario ma senza offset esplicito vengono trattate come
 * UTC e poi formattate/valutate sempre rispetto al fuso italiano.
 */
export function toEventDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = ISO_TIME_RE.test(trimmed) && !EXPLICIT_OFFSET_RE.test(trimmed)
    ? `${trimmed}Z`
    : trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toEventTimestampMs(input: string | Date | null | undefined): number | null {
  const date = toEventDate(input);
  return date ? date.getTime() : null;
}

export function formatRomeEventTime(input: string | Date | null | undefined): string {
  const date = toEventDate(input);
  return date ? ROME_TIME_FORMATTER.format(date) : '';
}

export function formatRomeEventDateTime(input: string | Date | null | undefined): string {
  const date = toEventDate(input);
  return date ? ROME_DATE_TIME_FORMATTER.format(date) : '';
}

/**
 * Restituisce un'etichetta giorno relativa in fuso Europe/Rome:
 * "oggi", "domani", "dopodomani" oppure "lunedì 30 maggio".
 * Confronta i giorni calendariali italiani per evitare drift mezzanotte.
 */
export function formatRomeDayLabel(
  input: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  const date = toEventDate(input);
  if (!date) return '';
  const today = getRomeCalendarParts(now);
  const target = getRomeCalendarParts(date);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const diffDays = Math.round((targetUtc - todayUtc) / 86_400_000);
  if (diffDays === 0) return 'oggi';
  if (diffDays === 1) return 'domani';
  if (diffDays === 2) return 'dopodomani';
  return ROME_DAY_LABEL_FORMATTER.format(date);
}

export function getRomeCalendarParts(input: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = ROME_PARTS_FORMATTER.format(input).split('-').map(Number);
  return { year, month, day };
}

export function getF1Season(input: Date = new Date()): number {
  return getRomeCalendarParts(input).year;
}

export function getMotoGPSeason(input: Date = new Date()): number {
  return getRomeCalendarParts(input).year;
}

export function getJuventusSeason(input: Date = new Date()): number {
  const { year, month } = getRomeCalendarParts(input);
  return month >= 7 ? year : year - 1;
}
