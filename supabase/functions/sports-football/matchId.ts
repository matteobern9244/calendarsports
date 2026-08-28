/**
 * Identita' e date delle partite, in un modulo a parte.
 *
 * Vive fuori da `index.ts` perche' `index.ts` chiama `Deno.serve` a livello
 * di modulo: importarlo da un test farebbe partire un server. Prima queste
 * tre funzioni erano ricopiate a mano dentro il file di test, che poteva
 * quindi restare verde mentre la funzione vera cambiava.
 */

const ROME_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Restituisce la data della partita nel fuso `Europe/Rome` come
 * `YYYY-MM-DD`. Se l'input è una stringa ISO senza offset, viene
 * trattato come UTC (tutti i provider football pubblicano in UTC).
 * Ritorna `null` per input invalidi.
 */
export function romeDateKeyOf(input: string | null | undefined): string | null {
  if (!input) return null;
  let normalized = input;
  if (
    typeof input === "string" &&
    /T\d{2}:\d{2}/.test(input) &&
    !/(Z|[+-]\d{2}:?\d{2})$/i.test(input)
  ) {
    normalized = `${input}Z`;
  }
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return ROME_DATE_FMT.format(d);
}

export function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildMatchId(match: any, competitionName: string): string {
  // Priorita' 1: slug derivato dall'URL Sky (univoco, leggibile, stabile).
  if (match?.link) {
    const m = String(match.link).match(/partite\/(\d{4})\/([^/]+)\/([^/]+)/i);
    if (m) {
      return `${m[1]}-${m[2]}-${m[3]}`.toLowerCase();
    }
  }
  // Priorita' 2: composizione deterministica competition+data+squadre.
  const home = slugify(match?.home?.name || "");
  const away = slugify(match?.away?.name || "");
  const dateKey = romeDateKeyOf(match?.date) ?? "unknown";
  const comp = slugify(competitionName);
  return `${comp}-${dateKey}-${home}-vs-${away}`;
}
