/**
 * Chi riceve cosa.
 *
 * Fino al 12 settembre 2026 il dispatcher non se lo chiedeva: ogni iscritto
 * riceveva ogni evento, e l'unico calendario di calcio che leggeva era quello
 * della Juventus. Chi nelle preferenze aveva scelto il Milan continuava a
 * ricevere «Juventus vs Inter sta per iniziare».
 *
 * Ora una subscription porta la **squadra seguita** e tre interruttori, uno
 * per sport. Questo modulo non importa niente e non fa niente all'import:
 * `index.ts` chiama `Deno.serve` a livello di modulo e non e' testabile, la
 * logica che decide sta qui.
 */

export type Sport = "football" | "f1" | "motogp";

export interface AudienceSubscription {
  /** Slug della squadra seguita, gia' validato da `push-subscribe`. */
  team: string;
  notify_football: boolean;
  notify_f1: boolean;
  notify_motogp: boolean;
}

export interface AudienceEvent {
  sport: Sport;
  /** Solo per il calcio: lo slug della squadra di cui e' la partita. */
  team?: string;
}

/** Dice se questa subscription vuole questo evento. */
export function wantsEvent(sub: AudienceSubscription, event: AudienceEvent): boolean {
  switch (event.sport) {
    case "football":
      return sub.notify_football && event.team === sub.team;
    case "f1":
      return sub.notify_f1;
    case "motogp":
      return sub.notify_motogp;
  }
}

/**
 * I calendari di calcio da scaricare in questo giro: uno per squadra seguita
 * da almeno un iscritto con il calcio acceso, in ordine stabile. Con venti
 * squadre possibili sono al piu' venti chiamate, e in pratica molte meno.
 */
export function footballTeamsToLoad(subs: readonly AudienceSubscription[]): string[] {
  const teams = new Set<string>();
  for (const s of subs) if (s.notify_football && s.team) teams.add(s.team);
  return [...teams].sort();
}
