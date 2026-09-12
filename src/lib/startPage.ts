import type { SectionKey, Sections } from "@/contexts/useUserPrefs";
import type { SerieATeam } from "@/lib/serieATeams";
import { teamPath } from "@/lib/teamRoutes";

/**
 * La pagina su cui si atterra aprendo l'applicazione.
 *
 * Questo modulo resta puro — niente React, niente rete — perche' la decisione
 * va presa al primo render della radice, prima che esista qualunque altra
 * cosa. L'import da `@/contexts/useUserPrefs` e' di soli **tipi** ed e'
 * voluto: TypeScript lo cancella in compilazione, quindi il bundle non vede
 * nessun ciclo e nessuna dipendenza da React arriva fin qui.
 *
 * Si memorizza la **sezione**, non l'indirizzo. Sono due cose diverse per la
 * voce della squadra, il cui indirizzo dipende dalla squadra preferita:
 * salvare `/squadra/juventus` lascerebbe la pagina iniziale puntata sui
 * bianconeri anche a chi nel frattempo ha scelto il Napoli. E' la stessa
 * ragione per cui gli indirizzi di una squadra si compongono in un posto solo
 * (`teamRoutes.ts`) invece di essere scritti a mano.
 */
export type StartPage =
  "home" | "calendario" | "streaming" | "sinner" | "squadra" | "f1" | "motogp";

export const DEFAULT_START_PAGE: StartPage = "home";

/**
 * L'indirizzo della Home.
 *
 * La Home ha un nome proprio perche' `/` ha smesso di essere solo «la Home»:
 * e' la radice, e la radice porta dove dice la preferenza. Senza questo
 * indirizzo, far vincere la preferenza vorrebbe dire rendere la Home
 * irraggiungibile.
 */
export const HOME_PATH = "/home";

export interface StartPageOption {
  value: StartPage;
  /** L'etichetta della tendina, gia' in italiano. */
  label: string;
  /**
   * La sezione che puo' nascondere questa voce, quando ne esiste una.
   * Dichiararla qui evita di ripetere altrove quali voci si possono spegnere:
   * il pannello la usa per non offrirle, e `startPagePath` per ripiegare.
   */
  section?: SectionKey;
}

/** Le sette voci, nell'ordine in cui si mostrano. */
export const START_PAGES: readonly StartPageOption[] = [
  { value: "home", label: "Home (predefinita)" },
  { value: "calendario", label: "Calendario" },
  { value: "streaming", label: "STREAMING" },
  { value: "sinner", label: "Jannik Sinner", section: "sinner" },
  { value: "squadra", label: "Squadra di calcio" },
  { value: "f1", label: "Formula 1", section: "f1" },
  { value: "motogp", label: "MotoGP", section: "motogp" },
];

/** Gli indirizzi che non dipendono da nient'altro. */
const PERCORSI_FISSI: Record<Exclude<StartPage, "squadra">, string> = {
  home: HOME_PATH,
  calendario: "/calendario",
  streaming: "/streaming",
  sinner: "/sinner",
  f1: "/formula1",
  motogp: "/motogp",
};

/**
 * La preferenza grezza diventa una pagina dell'elenco, **sempre**.
 *
 * E' totale come `resolveTeam`, e per lo stesso motivo: `profiles.start_page`
 * e' un `TEXT` senza `CHECK` — un vincolo congelerebbe nel database un elenco
 * che il codice possiede — quindi li' dentro puo' esserci qualunque cosa, e
 * niente di tutto cio' deve poter arrivare a una `<Navigate>`.
 */
export function resolveStartPage(value: string | null | undefined): StartPage {
  const normalizzato = (value ?? "").trim().toLowerCase();
  return START_PAGES.find((option) => option.value === normalizzato)?.value ?? DEFAULT_START_PAGE;
}

/**
 * La pagina su cui l'applicazione si apre **davvero**, che non sempre e'
 * quella scritta nel profilo.
 *
 * Chi sceglie MotoGP e poi nasconde la sezione MotoGP lascia nella colonna un
 * valore che ha smesso di descrivere la realta'. Il ripiego sulla Home non e'
 * una cortesia: `SectionRoute` rimanda alla radice chi apre una sezione
 * spenta, e la radice rimanda alla pagina iniziale — con la pagina iniziale
 * su una sezione nascosta i due si passerebbero il controllo all'infinito.
 *
 * E' anche cio' che si mostra nel pannello, perche' la domanda a cui la
 * tendina risponde e' «dove si apre l'app», non «cosa c'e' scritto nella
 * colonna». Il valore grezzo resta pero' dov'e': se la sezione torna
 * visibile, torna anche la sua pagina.
 */
export function effectiveStartPage(startPage: StartPage, sections: Sections): StartPage {
  const option = START_PAGES.find((candidate) => candidate.value === startPage);
  if (!option) return DEFAULT_START_PAGE;
  return option.section && !sections[option.section] ? DEFAULT_START_PAGE : startPage;
}

/**
 * Le voci che la tendina puo' offrire.
 *
 * Offrire una sezione nascosta vorrebbe dire offrire un comando inefficace:
 * la si sceglierebbe e al primo avvio `effectiveStartPage` ripiegherebbe
 * comunque sulla Home.
 */
export function startPageOptions(sections: Sections): readonly StartPageOption[] {
  return START_PAGES.filter((option) => !option.section || sections[option.section]);
}

/**
 * L'etichetta con cui la pagina si mostra all'utente.
 *
 * Sta qui e non nel componente perche' un `find` scritto in la' avrebbe avuto
 * bisogno di un ripiego per un caso che il tipo esclude gia', e un
 * `?? "Home"` sparso nella UI e' un ripiego che nessuno verifica mai.
 */
export function startPageLabel(startPage: StartPage): string {
  return START_PAGES.find((option) => option.value === startPage)?.label ?? START_PAGES[0].label;
}

/**
 * L'indirizzo su cui mandare chi apre la radice.
 *
 * Non restituisce mai `/`: sarebbe la radice che manda su se stessa.
 */
export function startPagePath(startPage: StartPage, team: SerieATeam, sections: Sections): string {
  const effettiva = effectiveStartPage(startPage, sections);
  return effettiva === "squadra" ? teamPath(team) : PERCORSI_FISSI[effettiva];
}
