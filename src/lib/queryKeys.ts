import type { HighlightSport, StreamingFamilyId, StreamingProviderId } from "@/lib/api/sportsApi";

/**
 * L'identita' della *lista* di partite: squadra, stagione, filtro. Le sue
 * pagine ci aggiungono `page` e `pageSize` in coda, quindi questa chiave e'
 * il loro prefisso — ed e' quello che permette a `keepPreviousPageOf` di
 * distinguere «un'altra pagina» da «un'altra squadra» senza contare le
 * posizioni a mano.
 *
 * Sta fuori dall'oggetto perche' `calendar` la richiama: un riferimento a
 * `queryKeys` dentro il proprio inizializzatore renderebbe il tipo `any`.
 */
const calendarList = (team: string, season: number, upcomingOnly = false) =>
  ["football", "calendar", team, season, upcomingOnly] as const;

/** Stesso ruolo per i risultati di Sinner: la lista e' la stagione. */
const resultsList = (season: number) => ["sinner", "results", season] as const;

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
   * Il namespace si chiamava `juventus` quando l'app aveva una squadra sola.
   * Rinominarlo azzera la cache, ma solo quella **in memoria**: non c'e'
   * `persistQueryClient`, quindi non esiste una copia su disco da invalidare
   * e al primo caricamento dopo il rilascio la cache sarebbe vuota comunque.
   *
   * `team` e' il **primo** argomento e non e' opzionale: una chiamata che lo
   * dimenticasse non condividerebbe la cache fra squadre in silenzio, non
   * compilerebbe.
   */
  football: {
    /**
     * La classifica non prende la squadra: il payload e' identico per tutte e
     * venti. Metterla nella chiave moltiplicherebbe per venti le stesse righe
     * e farebbe ricominciare da un caricamento a ogni cambio squadra.
     */
    standings: (season: number) => ["football", "standings", season] as const,
    calendarList,
    /**
     * `page` e `pageSize` fanno parte della chiave anche quando sono assenti:
     * la richiesta senza paginazione restituisce l'intera stagione ed e' una
     * voce di cache diversa da quella della prima pagina. Stanno **in coda**
     * di proposito: tutto cio' che identifica la lista viene prima, cosi' una
     * pagina si riconosce dal prefisso.
     */
    calendar: (
      team: string,
      season: number,
      page?: number,
      pageSize?: number,
      upcomingOnly = false,
    ) => [...calendarList(team, season, upcomingOnly), page ?? null, pageSize ?? null] as const,
    /** Il calendario ricomposto da tutte le pagine, per la vista aggregata. */
    calendarAll: (team: string, season: number, cap: number) =>
      ["football", "calendar-all", team, season, cap] as const,
    info: (team: string, season: number) => ["football", "info", team, season] as const,
    /**
     * La rosa **prende la stagione** anche se la pagina Sky da cui viene non
     * la nomina: cambiando stagione la rosa cambia davvero, e lo stadio che
     * viaggia con lei arriva da un endpoint della Lega che e' per stagione.
     * Una chiave senza stagione servirebbe la rosa di quest'anno sotto il
     * titolo di un'altra.
     */
    squad: (team: string, season: number) => ["football", "squad", team, season] as const,
    /** Le probabili della prossima partita della squadra. */
    lineups: (team: string, season: number) => ["football", "lineups", team, season] as const,
  },
  sinner: {
    info: () => ["sinner", "info"] as const,
    nextEvent: () => ["sinner", "next-event"] as const,
    schedule: (season: number) => ["sinner", "schedule", season] as const,
    resultsList,
    results: (season: number, page?: number, pageSize?: number) =>
      [...resultsList(season), page ?? null, pageSize ?? null] as const,
  },
  motogp: {
    calendar: (season: number) => ["motogp", "calendar", season] as const,
    nextEvent: () => ["motogp", "next-event"] as const,
    standings: (season: number) => ["motogp", "standings", season] as const,
    constructorStandings: (season: number) => ["motogp", "constructor-standings", season] as const,
  },
  highlights: (sport: HighlightSport, limit: number) => ["highlights", sport, limit] as const,
  /**
   * Il profilo dell'utente. `userId` puo' essere `null`: senza sessione la
   * query e' disabilitata, ma la chiave deve comunque esistere ed essere
   * stabile. La scrivono in tre — `onMutate`, `onError`, `onSuccess` — e un
   * aggiornamento ottimistico che leggesse una chiave diversa da quella che
   * scrive non fallirebbe: rimetterebbe a posto il niente.
   */
  profile: (userId: string | null) => ["profile", userId] as const,
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
