import type { SerieATeam } from "@/lib/serieATeams";

/**
 * Gli indirizzi delle pagine di una squadra, costruiti in un posto solo.
 *
 * Esistono perche' la forma della URL e' un contratto fra cose lontane fra
 * loro: la rotta dichiarata in `App.tsx`, i link del calendario, la card
 * della prossima partita, il redirect dai vecchi `/juventus*`, il calendario
 * aggregato. Scritta a mano in sei punti, basta che uno resti indietro perche'
 * un link porti a una pagina che non c'e' — e un link rotto non fa fallire
 * nessun typecheck.
 *
 * Prendono una `SerieATeam`, non uno slug: e' lo stesso motivo per cui
 * `favoriteTeam` non e' una stringa. Uno slug non validato che arriva in una
 * URL e' un indirizzo che promette una squadra e non la trova.
 */

/** La pagina di una squadra. */
export function teamPath(team: SerieATeam): string {
  return `/squadra/${team.slug}`;
}

/**
 * Il dettaglio di una partita, **dentro** la pagina della squadra da cui la si
 * apre. La stessa Juventus-Napoli ha percio' due indirizzi: e' voluto, perche'
 * ognuno dice da quale calendario si e' arrivati, ed e' cio' che permette al
 * «Torna al calendario» di riportare dove si era.
 *
 * L'id arriva dalla fonte e non e' detto che sia adatto a una URL: viene
 * codificato qui, cosi' resta un segmento solo anche se contenesse una barra.
 */
export function teamMatchPath(team: SerieATeam, matchId: string | null | undefined): string {
  return `${teamPath(team)}/partite/${encodeURIComponent(matchId ?? "")}`;
}

/**
 * La pagina della squadra su Sky Sport: il link di scampo che si offre quando
 * la nostra fonte non risponde o non ha niente da dire.
 *
 * E' la forma che Sky pubblica davvero — la stessa che la classifica
 * restituisce in `teamUrl`, per tutte e venti le squadre. Quella cablata
 * prima, `/calcio/serie-a/squadre/juventus`, non esisteva: un link di scampo
 * che porta altrove e' peggio di nessun link, perche' viene offerto proprio
 * quando e' l'unica cosa rimasta.
 *
 * Questa e' la copia statica, quella che funziona anche a fonte muta. Quando
 * la classifica risponde, `teamUrl` e' piu' autorevole di questa: arriva dalla
 * fonte ed e' allineato alla stagione.
 */
export function skyTeamPageUrl(team: SerieATeam): string {
  return `https://sport.sky.it/calcio/squadre/${team.slug}/news`;
}

/**
 * La squadra scritta in un indirizzo, o `null` se l'indirizzo non e' quello di
 * una pagina squadra.
 *
 * E' l'inverso di `teamPath`, e sta qui per quello: le due si devono il
 * contrario l'una dell'altra, e una forma di URL cambiata in un posto solo non
 * farebbe fallire nessun typecheck. Un test le tiene insieme su tutte e venti
 * le squadre.
 *
 * Serve a chi legge l'indirizzo stando **fuori** dalle rotte, dove
 * `useParams` non arriva: l'intestazione vive nel `Layout`, che avvolge le
 * rotte invece di starci dentro.
 *
 * Restituisce il segmento com'e', senza dire se sia davvero una squadra:
 * validarlo tocca a chi lo usa, con `resolveTeamStrict`.
 */
export function teamSlugFromPath(pathname: string): string | null {
  const match = /^\/squadra\/([^/]+)/.exec(pathname);
  return match ? match[1] : null;
}

/** Il riferimento con cui Sky identifica un atleta: entrambi i pezzi servono. */
export interface SkyPlayerRef {
  slug: string;
  id: string;
}

/**
 * Ricava slug e id dalla URL della scheda atleta pubblicata nella rosa.
 *
 * Sono **due** valori e servono tutti e due, verificato dal vivo l'11 settembre
 * 2026: `/calcio/atleti/{id}` risponde `404`, e cosi' `/calcio/atleti/x/{id}`
 * con lo slug sbagliato. Non esiste un indirizzo canonico che rediriga.
 *
 * Torna `null` — e non un oggetto a meta' — quando la URL non ha quella forma:
 * un giocatore senza scheda su Sky esiste, e la sua riga semplicemente non si
 * apre. Meglio una riga che non si apre di una richiesta che va a sbattere.
 *
 * La forma accettata e' stretta di proposito: questi due valori finiscono in
 * una URL a monte dentro la edge function, che li rivalida con lo stesso
 * criterio. Qui il controllo evita un viaggio inutile, li' e' la difesa vera.
 */
export function skyPlayerRef(profileUrl: string | null | undefined): SkyPlayerRef | null {
  if (!profileUrl) return null;
  const match = profileUrl.match(/\/calcio\/atleti\/([a-z0-9-]{1,80})\/(\d{1,12})(?:[/?#]|$)/);
  return match ? { slug: match[1], id: match[2] } : null;
}
