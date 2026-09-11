/**
 * Selezione della squadra: validazione del parametro e filtri sulle fonti.
 *
 * Vive fuori da `index.ts` per la stessa ragione di `matchId.ts`: `index.ts`
 * chiama `Deno.serve` a livello di modulo, quindi importarlo da un test
 * farebbe partire un server. E `tsconfig.app.json` include solo `src`, per cui
 * le edge function non passano nemmeno da `tsc -b`: se questa logica restasse
 * dentro `index.ts` non avrebbe né test né typecheck.
 *
 * Qui dentro ci sono due formati di partita, non uno, perché le due fonti
 * scrivono i nomi in campi diversi. Tenerli distinti e nominati evita che
 * qualcuno "semplifichi" leggendo il campo sbagliato sull'altra fonte e
 * ottenga zero partite senza nessun errore.
 */

import { matchesTeam, resolveTeamStrict, type SerieATeam } from "../_shared/serieATeams.ts";

export type TeamResolution = { ok: true; team: SerieATeam } | { ok: false; error: string };

/** Oltre questa lunghezza il valore non è una squadra: è qualcos'altro. */
const MAX_TEAM_PARAM_LENGTH = 64;

/**
 * Ripulisce il valore rifiutato prima di rimandarlo al client.
 *
 * Il messaggio deve dire *cosa* è stato rifiutato, altrimenti il 400 non è
 * diagnosticabile; ma non deve restituire tale e quale un input arbitrario.
 */
function forErrorMessage(raw: string): string {
  return raw
    .slice(0, 40)
    .replace(/[^\p{L}\p{N} .'-]/gu, "?")
    .trim();
}

/**
 * Traduce il parametro `team` in una squadra, o spiega perché non si può.
 *
 * Assente significa Juventus: i chiamanti già in produzione non passano
 * `team`, e devono continuare a vedere quello che vedevano prima.
 *
 * **Nota onesta sulla whitelist**: a differenza di `season`, `team` non finisce
 * mai dentro una URL a monte — i widget Sky sono per competizione, e il filtro
 * è nostro. Questa validazione non difende da una injection, difende il
 * contratto: un valore sconosciuto deve dare un 400 esplicito invece di un
 * calendario vuoto che sembra una squadra senza partite.
 */
export function resolveRequestedTeam(raw: string | null | undefined): TeamResolution {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, team: resolveTeamStrict("juventus")! };
  }
  if (raw.length > MAX_TEAM_PARAM_LENGTH) {
    return { ok: false, error: "Parametro team non valido" };
  }
  const team = resolveTeamStrict(raw);
  if (!team) {
    return { ok: false, error: `Squadra sconosciuta: ${forErrorMessage(raw)}` };
  }
  return { ok: true, team };
}

function nameOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function side(match: unknown, lato: "home" | "away"): Record<string, unknown> {
  if (!match || typeof match !== "object") return {};
  const squadra = (match as Record<string, unknown>)[lato];
  return squadra && typeof squadra === "object" ? (squadra as Record<string, unknown>) : {};
}

/**
 * Dice se la partita, nel formato dei widget Sky, riguarda questa squadra.
 * Sky espone un solo nome per lato, in `name`, nella forma breve.
 */
export function matchInvolvesTeam(match: unknown, team: SerieATeam): boolean {
  return (
    matchesTeam(nameOf(side(match, "home").name), team) ||
    matchesTeam(nameOf(side(match, "away").name), team)
  );
}

/**
 * Dice se la partita, nel formato dell'API Lega Serie A, riguarda questa
 * squadra.
 *
 * La Lega espone due nomi per lato e non è coerente su quale valorizzi:
 * `shortName` è «Inter», `officialName` è «Internazionale». Si guardano
 * entrambi, non il primo disponibile: leggerne uno solo perde le partite
 * ogni volta che la fonte cambia idea, e la perdita è silenziosa.
 */
export function legaMatchInvolvesTeam(match: unknown, team: SerieATeam): boolean {
  for (const lato of ["home", "away"] as const) {
    const squadra = side(match, lato);
    if (matchesTeam(nameOf(squadra.shortName), team)) return true;
    if (matchesTeam(nameOf(squadra.officialName), team)) return true;
  }
  return false;
}

/**
 * Trova l'id della stagione che inizia nell'anno richiesto, dentro la
 * risposta di `/competitions/{id}/seasons`.
 *
 * Sostituisce una mappa statica anno → id che era già sbagliata: «2026» e
 * «2025» puntavano allo stesso id, quindi i telecronisti della stagione
 * scorsa venivano presentati come quelli in corso. Un dato vecchio spacciato
 * per attuale non produce nessun sintomo visibile, ed è il motivo per cui la
 * mappa non torna nemmeno come ripiego.
 *
 * Ritorna `null` quando la stagione non c'è: meglio nessun telecronista che
 * il telecronista di un'altra stagione.
 */
export function pickSeasonId(payload: unknown, season: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const seasons = (payload as Record<string, unknown>).seasons;
  if (!Array.isArray(seasons)) return null;

  // La barra è portante: senza, «2026» accetterebbe anche una «20260/2027».
  const prefisso = `${season}/`;
  for (const entry of seasons) {
    if (!entry || typeof entry !== "object") continue;
    const { seasonId, seasonName } = entry as Record<string, unknown>;
    if (typeof seasonId !== "string" || typeof seasonName !== "string") continue;
    if (seasonName.startsWith(prefisso)) return seasonId;
  }
  return null;
}
