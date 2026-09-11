/**
 * NON MODIFICARE QUESTO FILE A MANO.
 *
 * È una copia generata di `src/lib/serieATeams.ts`: qualunque modifica scritta qui
 * viene sovrascritta, e nel frattempo l'app e le edge function offrirebbero
 * due elenchi di squadre diversi.
 *
 * Modifica la sorgente, poi rigenera con `bun run sync:teams`.
 */

/**
 * Le venti squadre di Serie A, con lo slug che le identifica in tutta l'app.
 *
 * **Questo e' un dataset statico e invecchia**: a ogni promozione e
 * retrocessione va riallineato. E' tarato sulla stagione 2026/27, verificata
 * sul widget classifica di Sky Sport (`competition-ranking/2026/21`).
 *
 * Esiste perche' tre cose servono *prima* che arrivi una risposta di rete: la
 * tendina delle preferenze deve poter comparire anche offline, il parametro
 * `team` dell'edge function ha bisogno di una whitelist, e lo slug che finisce
 * nelle URL e nelle chiavi di cache non puo' dipendere da uno scraping che
 * stamattina potrebbe rispondere 404.
 *
 * Quello che invece **non** sta qui e arriva a runtime da `action=standings`:
 * logo e URL della squadra, che la fonte espone gia' e tiene aggiornati.
 *
 * Questo file vive in due copie identiche: `src/lib/serieATeams.ts` per l'app
 * e `supabase/functions/_shared/serieATeams.ts` per le edge function, che
 * girano su Deno e vengono caricate con il solo contenuto di
 * `supabase/functions/`. Un guardiano vieta alle due copie di divergere.
 */

export interface SerieATeam {
  /** Identificatore stabile: URL, chiavi di cache, parametro edge, preferenza. */
  slug: string;
  /** Nome mostrato, identico a quello che scrive Sky Sport. */
  name: string;
  /**
   * Forme alternative **osservate sulle fonti**, non immaginate. La lista e'
   * corta perche' la realta' lo e': Serie A, Champions League e Coppa Italia
   * scrivono tutte lo stesso nome breve, e solo l'API della Lega Serie A usa
   * una forma estesa.
   */
  aliases: readonly string[];
}

export const DEFAULT_TEAM_SLUG = "juventus";

export const SERIE_A_TEAMS: readonly SerieATeam[] = [
  { slug: "atalanta", name: "Atalanta", aliases: [] },
  { slug: "bologna", name: "Bologna", aliases: [] },
  { slug: "cagliari", name: "Cagliari", aliases: [] },
  { slug: "como", name: "Como", aliases: [] },
  { slug: "fiorentina", name: "Fiorentina", aliases: [] },
  { slug: "frosinone", name: "Frosinone", aliases: [] },
  { slug: "genoa", name: "Genoa", aliases: [] },
  // «Internazionale» e' la forma dell'API Lega Serie A (`officialName`).
  { slug: "inter", name: "Inter", aliases: ["Internazionale"] },
  // Nessun alias «Juve»: in Coppa Italia gioca la Juve Stabia, e un confronto
  // per sottostringa infilerebbe le sue partite nel calendario juventino.
  { slug: "juventus", name: "Juventus", aliases: [] },
  { slug: "lazio", name: "Lazio", aliases: [] },
  { slug: "lecce", name: "Lecce", aliases: [] },
  { slug: "milan", name: "Milan", aliases: [] },
  { slug: "monza", name: "Monza", aliases: [] },
  { slug: "napoli", name: "Napoli", aliases: [] },
  { slug: "parma", name: "Parma", aliases: [] },
  { slug: "roma", name: "Roma", aliases: [] },
  { slug: "sassuolo", name: "Sassuolo", aliases: [] },
  { slug: "torino", name: "Torino", aliases: [] },
  { slug: "udinese", name: "Udinese", aliases: [] },
  { slug: "venezia", name: "Venezia", aliases: [] },
] as const;

/**
 * Riduce un nome alla forma su cui si fanno i confronti: minuscolo, senza
 * accenti, senza punteggiatura, con gli spazi normalizzati.
 */
export function normalizeTeamName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Dice se `rawName`, come lo scrive la fonte, e' questa squadra.
 *
 * Il confronto e' per **uguaglianza esatta** sul nome normalizzato, mai per
 * sottostringa: `"Juve Stabia".includes("juve")` e' vero, e sarebbe un
 * calendario sbagliato che nessuno segnalerebbe come bug.
 */
export function matchesTeam(rawName: string | null | undefined, team: SerieATeam): boolean {
  const normalized = normalizeTeamName(rawName);
  if (!normalized) return false;
  if (normalized === normalizeTeamName(team.name)) return true;
  return team.aliases.some((alias) => normalized === normalizeTeamName(alias));
}

/** La squadra con questo slug, o `undefined`. */
export function teamBySlug(slug: string | null | undefined): SerieATeam | undefined {
  const normalized = normalizeTeamName(slug).replace(/ /g, "-");
  return SERIE_A_TEAMS.find((team) => team.slug === normalized);
}

/**
 * Risolve slug, nome o alias in una squadra. Restituisce `null` quando il
 * valore non corrisponde a niente: e' la forma che serve per **validare**, per
 * esempio il parametro di una edge function o uno slug arrivato dalla URL.
 */
export function resolveTeamStrict(value: string | null | undefined): SerieATeam | null {
  if (!value) return null;
  const bySlug = teamBySlug(value);
  if (bySlug) return bySlug;
  return SERIE_A_TEAMS.find((team) => matchesTeam(value, team)) ?? null;
}

/**
 * La squadra mostrata quando non se ne e' scelta nessuna.
 *
 * Il `!` e' sicuro perche' `DEFAULT_TEAM_SLUG` e' uno degli slug qui sopra, e
 * un test lo verifica: se qualcuno togliesse la Juventus dall'elenco senza
 * cambiare il default, quel test diventerebbe rosso prima del deploy.
 */
export const DEFAULT_TEAM: SerieATeam = SERIE_A_TEAMS.find(
  (team) => team.slug === DEFAULT_TEAM_SLUG,
)!;

/**
 * Come `resolveTeamStrict`, ma **totale**: qualunque valore produce una
 * squadra, ripiegando sul default.
 *
 * E' la forma che serve per **leggere una preferenza**. La vecchia casella di
 * testo accettava qualunque cosa, quindi in `profiles.favorite_team` e in
 * `localStorage` puo' esserci di tutto: qui dentro smette di essere un
 * problema, senza aspettare che la migration sia passata ovunque.
 */
export function resolveTeam(value: string | null | undefined): SerieATeam {
  return resolveTeamStrict(value) ?? DEFAULT_TEAM;
}
