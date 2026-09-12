import { createContext, useContext } from "react";
import { DEFAULT_TEAM, resolveTeam, type SerieATeam } from "@/lib/serieATeams";
import type { StartPage } from "@/lib/startPage";

/**
 * Le voci dell'intestazione, tutte nascondibili.
 *
 * Fino alla 3.3.0 erano solo le tre sportive: l'elenco delle preferenze
 * copriva meta' del menu', e quale meta' era una scelta di allora piu' che una
 * regola.
 *
 * **Nascondere riguarda solo il menu'.** Nessuna di queste preferenze rende
 * irraggiungibile una pagina: ogni indirizzo continua a rispondere, perche' un
 * link verso `/squadra/napoli` e' fatto per essere condiviso e deve funzionare
 * anche per chi quella voce l'ha tolta dal proprio. Prima le tre sportive
 * facevano anche la seconda cosa, tramite un componente di rotta che per
 * questo non esiste piu'.
 */
export type SectionKey =
  "home" | "calendario" | "streaming" | "sinner" | "squadra" | "f1" | "motogp";
export type Sections = Record<SectionKey, boolean>;
export type ThemeValue = "light" | "dark";

export const DEFAULT_SECTIONS: Sections = {
  home: true,
  calendario: true,
  streaming: true,
  sinner: true,
  squadra: true,
  f1: true,
  motogp: true,
};

/**
 * Le voci con la loro etichetta, nell'ordine dell'intestazione.
 *
 * L'ordine e' quello del menu' e non alfabetico: l'elenco delle preferenze
 * deve somigliare a cio' che si sta configurando, altrimenti per capire quale
 * interruttore spegne cosa bisogna tradurre mentalmente due ordini diversi.
 */
export const MENU_SECTIONS: ReadonlyArray<{ key: SectionKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "calendario", label: "Calendario" },
  { key: "streaming", label: "STREAMING" },
  { key: "sinner", label: "Jannik Sinner" },
  { key: "squadra", label: "Squadra di calcio" },
  { key: "f1", label: "Formula 1" },
  { key: "motogp", label: "MotoGP" },
];

export const SECTIONS_STORAGE_KEY = "cse-sections";
export const TEAM_STORAGE_KEY = "cse-favorite-team";

export interface UserPrefsValue {
  theme: ThemeValue;
  setTheme: (value: ThemeValue) => void;
  /**
   * La squadra preferita **gia' risolta**, mai il valore grezzo che c'e'
   * scritto nel profilo o sul dispositivo. La preferenza e' nata come casella
   * di testo libero, quindi li' dentro puo' esserci qualunque cosa; qui no, e
   * il tipo lo dice: chi ha bisogno dello slug per una chiave di cache o per
   * una URL non puo' prenderlo per sbaglio da una stringa non validata.
   */
  favoriteTeam: SerieATeam;
  /** Accetta slug, nome o alias: quello che non e' una squadra torna al default. */
  setFavoriteTeam: (value: string) => void;
  sections: Sections;
  setSection: (key: SectionKey, value: boolean) => void;
  /**
   * La pagina su cui l'applicazione si apre, **gia' effettiva**: se la
   * sezione scelta e' nascosta qui c'e' gia' scritto `home`, perche' la
   * domanda a cui questo valore risponde e' «dove si apre l'app» e non «cosa
   * c'e' scritto nella colonna». E' la stessa ragione per cui `favoriteTeam`
   * non e' la stringa grezza del profilo.
   */
  startPage: StartPage;
  /**
   * Salva la scelta sul profilo. Senza accesso non fa niente: a differenza
   * delle altre tre, questa preferenza non ha uno specchio sul dispositivo.
   */
  setStartPage: (value: StartPage) => void;
  /**
   * `false` finche' non si sa dove mandare chi apre la radice — la sessione
   * si sta ancora leggendo, o il profilo non e' ancora arrivato. Dipingere
   * qualcosa prima vorrebbe dire mostrare una pagina e poi saltare altrove.
   */
  startPageReady: boolean;
  /** `true` se l'utente ha effettuato l'accesso (preferenze salvate sul profilo). */
  isAuthenticated: boolean;
}

export const UserPrefsContext = createContext<UserPrefsValue | null>(null);

export function useUserPrefs(): UserPrefsValue {
  const ctx = useContext(UserPrefsContext);
  if (!ctx) throw new Error("useUserPrefs va usato dentro UserPrefsProvider");
  return ctx;
}

/** Preferenze locali: fallback per chi non ha effettuato l'accesso. */
export function loadLocalSections(): Sections {
  if (typeof window === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = window.localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw) as Partial<Sections>;
    return { ...DEFAULT_SECTIONS, ...parsed };
  } catch {
    return DEFAULT_SECTIONS;
  }
}

/**
 * La squadra ricordata sul dispositivo, **sempre come slug**.
 *
 * Risolve qui e non piu' in la' perche' questo valore non serve solo a
 * mostrare qualcosa: al primo accesso viene copiato nel profilo dalla
 * migrazione. Un nome digitato a mano anni fa finirebbe cosi' dentro
 * `profiles.favorite_team`, che e' proprio il posto da cui si sta cercando di
 * toglierlo.
 */
export function loadLocalTeam(): string {
  if (typeof window === "undefined") return DEFAULT_TEAM.slug;
  try {
    return resolveTeam(window.localStorage.getItem(TEAM_STORAGE_KEY)).slug;
  } catch {
    return DEFAULT_TEAM.slug;
  }
}
