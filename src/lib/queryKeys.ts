import type { HighlightSport, StreamingFamilyId, StreamingProviderId } from "@/lib/api/sportsApi";

/**
 * Le chiavi di cache di React Query, definite in un posto solo.
 *
 * `setQueryData` e `getQueryData` richiedono la corrispondenza **esatta** della
 * chiave: un elemento in piu' o in meno non produce un errore, produce
 * semplicemente un buco nero. `useSyncAll` riscriveva le chiavi a mano invece
 * di riusare quelle degli hook, e una era gia' divergente — scriveva
 * `["sinner", "results", stagione]` mentre `useSinnerResults` leggeva la stessa
 * cosa con cinque elementi. Il risultato era che il prefetch dei risultati di
 * Sinner veniva buttato via a ogni sincronizzazione, senza che niente lo
 * segnalasse.
 *
 * Chi legge e chi scrive devono passare da qui.
 */
export const queryKeys = {
  f1: {
    calendar: (season: number) => ["f1", "calendar", season] as const,
    driverStandings: (season: number) => ["f1", "driver-standings", season] as const,
    constructorStandings: (season: number) => ["f1", "constructor-standings", season] as const,
    nextRace: () => ["f1", "next-race"] as const,
  },
  /**
   * Il namespace si chiama ancora `juventus` di proposito: e' un pezzo di
   * chiave di cache, e cambiarlo invalida tutto quello che e' in memoria.
   * La rinomina in `football` e' un commit a se', senza altro dentro.
   *
   * `team` e' il **primo** argomento e non e' opzionale: una chiamata che lo
   * dimenticasse non condividerebbe la cache fra squadre in silenzio, non
   * compilerebbe.
   */
  juventus: {
    /**
     * La classifica non prende la squadra: il payload e' identico per tutte e
     * venti. Metterla nella chiave moltiplicherebbe per venti le stesse righe
     * e farebbe ricominciare da un caricamento a ogni cambio squadra.
     */
    standings: (season: number) => ["juventus", "standings", season] as const,
    /**
     * `page` e `pageSize` fanno parte della chiave anche quando sono assenti:
     * la richiesta senza paginazione restituisce l'intera stagione ed e' una
     * voce di cache diversa da quella della prima pagina.
     */
    calendar: (
      team: string,
      season: number,
      page?: number,
      pageSize?: number,
      upcomingOnly = false,
    ) =>
      ["juventus", "calendar", team, season, page ?? null, pageSize ?? null, upcomingOnly] as const,
    /** Il calendario ricomposto da tutte le pagine, per la vista aggregata. */
    calendarAll: (team: string, season: number, cap: number) =>
      ["juventus", "calendar-all", team, season, cap] as const,
    info: (team: string, season: number) => ["juventus", "info", team, season] as const,
  },
  sinner: {
    info: () => ["sinner", "info"] as const,
    nextEvent: () => ["sinner", "next-event"] as const,
    schedule: (season: number) => ["sinner", "schedule", season] as const,
    results: (season: number, page?: number, pageSize?: number) =>
      ["sinner", "results", season, page ?? null, pageSize ?? null] as const,
  },
  motogp: {
    calendar: (season: number) => ["motogp", "calendar", season] as const,
    nextEvent: () => ["motogp", "next-event"] as const,
    standings: (season: number) => ["motogp", "standings", season] as const,
    constructorStandings: (season: number) => ["motogp", "constructor-standings", season] as const,
  },
  highlights: (sport: HighlightSport, limit: number) => ["highlights", sport, limit] as const,
  streaming: {
    tv: (family: StreamingFamilyId) => ["streaming-tv", family] as const,
    releases: (provider: StreamingProviderId, dateFrom?: string, dateTo?: string) =>
      ["streaming-releases", provider, dateFrom ?? "", dateTo ?? ""] as const,
    releasesItaly: (
      provider: StreamingProviderId | "all" | undefined,
      kind: string | undefined,
      dateFrom: string | undefined,
      dateTo: string | undefined,
      sort: string | undefined,
      genreId: number | undefined,
    ) =>
      [
        "streaming-releases-italy",
        provider ?? "all",
        kind ?? "all",
        dateFrom ?? "",
        dateTo ?? "",
        sort ?? "release",
        genreId ?? 0,
      ] as const,
    /**
     * `type` e `id` possono essere `null`: il dialog di dettaglio monta prima
     * che l'utente scelga un titolo, e in quel momento la query e' disabilitata.
     * La chiave deve comunque esistere ed essere stabile.
     */
    credits: (type: string | null, id: string | number | null) =>
      ["streaming-credits", type, id] as const,
    details: (type: string | null, id: string | number | null) =>
      ["streaming-release-details", type, id] as const,
  },
} as const;
