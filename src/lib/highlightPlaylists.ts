/**
 * Le playlist YouTube da cui arrivano gli highlights, e quali squadre ne
 * hanno una.
 *
 * Prima della 3.3.0 questa conoscenza era in tre posti: la mappa cablata
 * dentro l'edge function, una seconda mappa di indirizzi dentro
 * `HighlightsSection`, e la condizione `team.slug === DEFAULT_TEAM.slug`
 * ripetuta due volte in `TeamPage`. Con una sola squadra la ripetizione
 * passava inosservata; con due, dimenticarne una vorrebbe dire una linguetta
 * «Highlights» che si apre sui video dell'altra squadra — un dato di qualcun
 * altro presentato come proprio, che e' il difetto peggiore di tutti.
 *
 * Questo modulo e' puro di proposito: niente React, niente rete, nessun
 * import da `@/lib/serieATeams`. Gli slug sono stringhe letterali perche'
 * cosi' il file resta copiabile dentro `supabase/functions/`, dove un import
 * che risalga in `src/` supera il typecheck e si rompe al deploy.
 */

export type HighlightSport = "juventus" | "milan" | "f1" | "motogp";

interface Playlist {
  /** Identificativo YouTube, senza il parametro `si=` di tracciamento. */
  id: string;
  /** Come si chiama la raccolta quando va nominata all'utente. */
  label: string;
}

export const HIGHLIGHT_PLAYLISTS: Record<HighlightSport, Playlist> = {
  // «JUVENTUS FIRST TEAM HIGHLIGHTS | 2026/27 SEASON», la stagione in corso.
  juventus: { id: "PLVuEWoNX08GA", label: "Juventus" },
  // «Highlights 2026/27 | Men's First Team» del canale AC Milan.
  milan: { id: "PLW7Xs51ob1LI", label: "Milan" },
  f1: { id: "PLZbcTUGG8ELs188DCvpKMVFsnia-uB3j8", label: "Formula 1" },
  motogp: { id: "PLMgcIchslSqgqxtkUg4iiqc1UL8u8uFey", label: "MotoGP" },
};

/**
 * Le squadre di Serie A che hanno una playlist, per slug.
 *
 * Sono due su venti, e non per dimenticanza: ogni voce qui dentro e' un
 * identificativo che qualcuno ha verificato a mano sul feed. Le altre
 * diciotto non mostrano la scheda affatto — mai una scheda vuota, che
 * prometterebbe dei video a chi la tocca.
 *
 * E' una `Map` e non un oggetto letterale perche' lo slug arriva dall'URL
 * (`/squadra/:slug`): con un oggetto, `slug` uguale a `constructor`,
 * `toString` o `__proto__` pesca dal prototipo, non e' nullish e attraversa
 * indenne un `?? null`, restituendo una funzione dove il tipo promette
 * `HighlightSport | null`. Una `Map` non ha un prototipo da cui pescare.
 */
const SQUADRE_CON_PLAYLIST = new Map<string, HighlightSport>([
  ["juventus", "juventus"],
  ["milan", "milan"],
]);

/**
 * Quale raccolta di highlights spetta a una squadra, `null` se non ne ha.
 *
 * Totale: uno slug sconosciuto vale quanto una squadra senza playlist, e
 * nessun chiamante deve ricordarsi di validare prima.
 */
export function highlightSportPerSquadra(slug: string): HighlightSport | null {
  return SQUADRE_CON_PLAYLIST.get(slug) ?? null;
}

/** L'indirizzo pubblico della playlist, quello del pulsante «Vedi playlist completa». */
export function playlistUrl(sport: HighlightSport): string {
  return `https://www.youtube.com/playlist?list=${HIGHLIGHT_PLAYLISTS[sport].id}`;
}
