import { toRomeDate } from "@/lib/dateUtils";
import { STREAMING_FAMILIES, STREAMING_PROVIDERS } from "@/hooks/useStreamingData";
import type { StreamingFamilyId, StreamingProviderId } from "@/lib/api/sportsApi";

/**
 * I filtri di `StreamingPage` e la loro serializzazione nell'indirizzo.
 *
 * Stanno qui, fuori dal componente, perche' sono l'unica parte di quella
 * pagina che puo' rompersi senza che si veda: la UI continuerebbe a
 * funzionare, ignorando o corrompendo l'indirizzo. Un link condiviso che
 * riporta a uno stato diverso da quello che si stava guardando non fa
 * rumore da nessuna parte.
 */

export type RangeId = "7d" | "30d" | "90d";
export type KindId = "all" | "movie" | "tv";
export type SortId = "release" | "popularity";
export type StreamingTab = "tv" | "releases";

// Le "Nuove uscite" usano TMDB Discover filtrando per primary_release_date
// (film) / first_air_date (serie) e per provider IT. TMDB non espone una data
// di "platform add", quindi finestre da 1-7 giorni sono spesso vuote.
// `daysBack = 0` per i range "futuri", > 0 per la finestra estesa.
export const RANGES: { id: RangeId; label: string; daysBack: number; daysFwd: number }[] = [
  { id: "7d", label: "Prossimi 7 giorni", daysBack: 0, daysFwd: 7 },
  { id: "30d", label: "Prossimi 30 giorni", daysBack: 0, daysFwd: 30 },
  { id: "90d", label: "Finestra estesa", daysBack: 30, daysFwd: 60 },
];

export const KINDS: { id: KindId; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "movie", label: "Film" },
  { id: "tv", label: "Serie" },
];

// Selezione minima di generi TMDB piu' richiesti, label IT.
// L'id segue la mappa ufficiale TMDB (movie + tv condividono molti id base).
export const GENRES: { id: number | null; label: string }[] = [
  { id: null, label: "Tutti i generi" },
  { id: 28, label: "Azione" },
  { id: 12, label: "Avventura" },
  { id: 16, label: "Animazione" },
  { id: 35, label: "Commedia" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentario" },
  { id: 18, label: "Drammatico" },
  { id: 10751, label: "Famiglia" },
  { id: 14, label: "Fantasy" },
  { id: 27, label: "Horror" },
  { id: 9648, label: "Mistero" },
  { id: 10749, label: "Romantico" },
  { id: 878, label: "Sci-Fi" },
  { id: 53, label: "Thriller" },
];

export function isFamily(value: string | null): value is StreamingFamilyId {
  return !!value && STREAMING_FAMILIES.some((f) => f.id === value);
}

export function isProvider(value: string | null): value is StreamingProviderId {
  return !!value && STREAMING_PROVIDERS.some((p) => p.id === value);
}

export function isRange(value: string | null): value is RangeId {
  return !!value && RANGES.some((r) => r.id === value);
}

export function isKind(value: string | null): value is KindId {
  return !!value && KINDS.some((k) => k.id === value);
}

export function isSort(value: string | null): value is SortId {
  return value === "release" || value === "popularity";
}

export interface StreamingFilters {
  tab: StreamingTab;
  family: StreamingFamilyId;
  range: RangeId;
  kind: KindId;
  sort: SortId;
  genre: number | null;
  italyProvider: StreamingProviderId | "all";
  page: number;
}

export const DEFAULT_FILTERS: StreamingFilters = {
  tab: "tv",
  family: "rai",
  range: "7d",
  kind: "all",
  sort: "release",
  genre: null,
  italyProvider: "all",
  page: 1,
};

/**
 * Lo stato di partenza, letto dall'indirizzo.
 *
 * Ogni parametro passa da una guardia: sono valori che chiunque puo' scrivere
 * a mano nella barra degli indirizzi, e uno sconosciuto deve produrre il
 * default, non uno stato impossibile. Il genere in particolare finisce dentro
 * una query verso TMDB, quindi accetta solo cifre.
 */
export function readFilters(params: URLSearchParams): StreamingFilters {
  // Ogni valore in una variabile prima della guardia: `isFamily(params.get(x))`
  // restringe l'argomento, non una seconda `params.get(x)`, e il `!` che
  // servirebbe a zittire il compilatore sarebbe un cast travestito da tipo.
  const family = params.get("family");
  const range = params.get("range");
  const kind = params.get("kind");
  const sort = params.get("sort");
  const provider = params.get("itProvider");
  const genre = params.get("genre");
  const page = parseInt(params.get("page") ?? "1", 10);

  return {
    tab: params.get("tab") === "releases" ? "releases" : "tv",
    family: isFamily(family) ? family : DEFAULT_FILTERS.family,
    range: isRange(range) ? range : DEFAULT_FILTERS.range,
    kind: isKind(kind) ? kind : DEFAULT_FILTERS.kind,
    sort: isSort(sort) ? sort : DEFAULT_FILTERS.sort,
    genre: genre && /^\d+$/.test(genre) ? parseInt(genre, 10) : null,
    italyProvider: isProvider(provider) ? provider : DEFAULT_FILTERS.italyProvider,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
  };
}

/**
 * L'indirizzo che descrive lo stato corrente.
 *
 * Scrive solo i filtri della scheda in vista, e tace sui valori di default:
 * un indirizzo che dichiarasse anche lo stato dell'altra scheda prometterebbe
 * qualcosa che non si sta guardando.
 */
export function writeFilters(f: StreamingFilters): URLSearchParams {
  const next = new URLSearchParams();
  next.set("tab", f.tab);
  if (f.tab === "tv") {
    next.set("family", f.family);
  } else {
    if (f.italyProvider !== "all") next.set("itProvider", f.italyProvider);
    if (f.sort !== "release") next.set("sort", f.sort);
    if (f.genre !== null) next.set("genre", String(f.genre));
    if (f.range !== "7d") next.set("range", f.range);
    if (f.kind !== "all") next.set("kind", f.kind);
  }
  if (f.page > 1) next.set("page", String(f.page));
  return next;
}

// Costruito una volta sola: `Intl.DateTimeFormat` costa circa settanta volte
// la sua `format`, e questa funzione viene chiamata una volta per programma
// del palinsesto.
const ROME_HOUR = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** L'ora di Roma di un ISO, oppure un trattino se la data non e' leggibile. */
export function formatHour(iso: string): string {
  const d = toRomeDate(iso);
  if (!d) return "—";
  return ROME_HOUR.format(d);
}
