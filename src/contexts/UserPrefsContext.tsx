import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useProfile, useUpdateProfile, type Profile, type ProfilePatch } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { resolveTeam } from "@/lib/serieATeams";
import { resolveStartPage, type StartPage } from "@/lib/startPage";
import {
  DEFAULT_SECTIONS,
  SECTIONS_STORAGE_KEY,
  TEAM_STORAGE_KEY,
  UserPrefsContext,
  loadLocalSections,
  loadLocalTeam,
  type SectionKey,
  type Sections,
  type ThemeValue,
  type UserPrefsValue,
} from "./useUserPrefs";

/**
 * Quale colonna del profilo conserva quale voce del menu'.
 *
 * Sta qui, una volta sola, perche' la corrispondenza serviva in tre punti —
 * la migrazione al primo accesso, la lettura, il salvataggio — e con tre voci
 * ripeterla passava inosservato. Con sette, una riga dimenticata sarebbe una
 * preferenza che si salva e non si rilegge. `Record<SectionKey, ...>` obbliga
 * il compilatore a pretenderle tutte.
 */
const COLONNA_SEZIONE: Record<SectionKey, keyof ProfilePatch> = {
  home: "show_home",
  calendario: "show_calendario",
  streaming: "show_streaming",
  sinner: "show_sinner",
  squadra: "show_squadra",
  f1: "show_f1",
  motogp: "show_motogp",
};

const CHIAVI_SEZIONE = Object.keys(COLONNA_SEZIONE) as SectionKey[];

/** Le voci visibili secondo il profilo. */
function sezioniDalProfilo(profile: Profile): Sections {
  return Object.fromEntries(
    CHIAVI_SEZIONE.map((chiave) => [chiave, profile[COLONNA_SEZIONE[chiave]] as boolean]),
  ) as Sections;
}

/** Le stesse, nella forma che il profilo si aspetta. */
function sezioniVersoProfilo(sections: Sections): ProfilePatch {
  return Object.fromEntries(
    CHIAVI_SEZIONE.map((chiave) => [COLONNA_SEZIONE[chiave], sections[chiave]]),
  ) as ProfilePatch;
}

const MIGRATION_KEY_PREFIX = "cse-profile-migrated:";

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage puo' non essere disponibile */
  }
}

function removeLocal(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* localStorage puo' non essere disponibile */
  }
}

/**
 * Sorgente unica delle preferenze: profilo online se l'utente ha effettuato
 * l'accesso, `localStorage` altrimenti. Al primo accesso le scelte già
 * presenti sul dispositivo vengono trasferite nel profilo.
 */
export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme: setThemeLocal } = useTheme();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [localSections, setLocalSections] = useState<Sections>(() => loadLocalSections());
  const [localTeam, setLocalTeam] = useState<string>(() => loadLocalTeam());
  const migratedFor = useRef<string | null>(null);

  const isAuthenticated = Boolean(user);

  // Primo accesso: le preferenze del dispositivo diventano il profilo.
  useEffect(() => {
    if (!user || !profile) return;
    const key = `${MIGRATION_KEY_PREFIX}${user.id}`;
    if (migratedFor.current === user.id) return;
    let done: boolean;
    try {
      done = window.localStorage.getItem(key) === "1";
    } catch {
      done = false;
    }
    migratedFor.current = user.id;
    if (done) return;
    writeLocal(key, "1");
    updateProfile.mutate(
      {
        theme,
        favorite_team: localTeam,
        ...sezioniVersoProfilo(localSections),
      },
      {
        // Il segno si scrive prima di sapere com'e' andata, perche' serve a
        // non far ripartire la migrazione a ogni render. Se pero' il
        // salvataggio fallisce e il segno resta, le preferenze del dispositivo
        // non arriveranno mai sul profilo e nessuno se ne accorgera'.
        // `migratedFor` resta invece segnato: il nuovo tentativo e' al
        // prossimo avvio, non subito, cosi' un errore che si ripete non
        // diventa una raffica di richieste.
        onError: () => removeLocal(key),
      },
    );
  }, [user, profile, theme, localTeam, localSections, updateProfile]);

  // Dopo la migrazione (o ai successivi accessi) vale il profilo.
  useEffect(() => {
    if (!profile) return;
    if (profile.theme === "light" || profile.theme === "dark") {
      setThemeLocal(profile.theme);
    }
  }, [profile, setThemeLocal]);

  const sections: Sections = useMemo(
    () => (profile ? sezioniDalProfilo(profile) : localSections),
    [profile, localSections],
  );

  /**
   * La pagina iniziale **non dipende dalle voci visibili**, e non e' una
   * dimenticanza. Nascondere una voce tocca il menu' e nient'altro: legarci
   * anche la pagina iniziale vorrebbe dire che riordinando l'intestazione si
   * cambia di nascosto dove l'app si apre. Nessuna pagina e' irraggiungibile,
   * quindi nessuna scelta ha bisogno di un ripiego.
   */
  const startPage = resolveStartPage(profile?.start_page);

  /**
   * Si sa dove mandare chi apre la radice solo quando la sessione e' stata
   * letta e, se c'e' un utente, la lettura del profilo si e' conclusa —
   * riuscita o fallita che sia. `useProfile` e' disabilitata senza sessione,
   * e una query disabilitata non sta caricando: il caso «nessun accesso» e'
   * percio' pronto subito.
   *
   * Fallita compresa, di proposito: restare in attesa di un profilo che non
   * arrivera' mai vorrebbe dire uno spinner senza fine davanti a chi apre
   * l'app con la rete a pezzi. La Home e' un ripiego, un blocco no.
   */
  const startPageReady = !authLoading && !profileLoading;

  /**
   * La preferenza grezza si ferma qui: da questa riga in poi esiste solo una
   * squadra dell'elenco. `resolveTeam` e' totale, quindi un valore legacy —
   * un nome digitato nella vecchia casella di testo, o una stringa vuota — non
   * ha bisogno che la migration del database sia gia' passata.
   *
   * Non serve memoizzare: `resolveTeam` restituisce sempre uno degli oggetti
   * di `SERIE_A_TEAMS`, quindi a parita' di preferenza l'identita' e' la
   * stessa e il `useMemo` del contesto non si invalida.
   */
  const favoriteTeam = resolveTeam(profile?.favorite_team ?? localTeam);

  /**
   * Scrive lo specchio locale della squadra. Serve anche a chi ha effettuato
   * l'accesso: e' il valore che resta dopo l'uscita, ed e' quello che la
   * migrazione copia sul profilo al primo accesso da un altro dispositivo.
   */
  const ricordaSquadra = useCallback((slug: string) => {
    setLocalTeam(slug);
    writeLocal(TEAM_STORAGE_KEY, slug);
  }, []);

  const ricordaSezioni = useCallback((value: Sections) => {
    setLocalSections(value);
    writeLocal(SECTIONS_STORAGE_KEY, JSON.stringify(value));
  }, []);

  /**
   * Il tema e' l'unica delle tre preferenze che non ha bisogno di un
   * ripristino esplicito dello specchio locale: l'effect «vale il profilo»
   * riallinea `useTheme` a ogni cambio del profilo, quindi quando la mutation
   * fallisce e la cache torna indietro, il tema — e con lui `cse-theme` in
   * `localStorage` — la segue da solo.
   */
  const setTheme = useCallback(
    (value: ThemeValue) => {
      setThemeLocal(value);
      if (user) updateProfile.mutate({ theme: value });
    },
    [setThemeLocal, user, updateProfile],
  );

  const setFavoriteTeam = useCallback(
    (value: string) => {
      const team = resolveTeam(value);
      const precedente = localTeam;
      ricordaSquadra(team.slug);
      if (!user) return;
      // Senza questo ripristino il profilo torna indietro (`useUpdateProfile`)
      // ma il dispositivo no: la squadra che il server ha rifiutato resta li',
      // invisibile finche' vince il profilo e in pagina alla prima uscita.
      updateProfile.mutate(
        { favorite_team: team.slug },
        { onError: () => ricordaSquadra(precedente) },
      );
    },
    [user, updateProfile, localTeam, ricordaSquadra],
  );

  /**
   * Nessuno specchio locale da ripristinare al fallimento: questa preferenza
   * vive solo sul profilo, e il ritorno indietro della cache in
   * `useUpdateProfile` e' tutto quello che serve.
   */
  const setStartPage = useCallback(
    (value: StartPage) => {
      if (!user) return;
      updateProfile.mutate({ start_page: value });
    },
    [user, updateProfile],
  );

  const setSection = useCallback(
    (key: SectionKey, value: boolean) => {
      const base = profile ? sezioniDalProfilo(profile) : localSections;
      const next: Sections = { ...DEFAULT_SECTIONS, ...base, [key]: value };
      const precedente = localSections;
      ricordaSezioni(next);
      if (!user) return;
      updateProfile.mutate(sezioniVersoProfilo(next), {
        onError: () => ricordaSezioni(precedente),
      });
    },
    [profile, localSections, user, updateProfile, ricordaSezioni],
  );

  const value = useMemo<UserPrefsValue>(
    () => ({
      theme,
      setTheme,
      favoriteTeam,
      setFavoriteTeam,
      sections,
      setSection,
      startPage,
      setStartPage,
      startPageReady,
      isAuthenticated,
    }),
    [
      theme,
      setTheme,
      favoriteTeam,
      setFavoriteTeam,
      sections,
      setSection,
      startPage,
      setStartPage,
      startPageReady,
      isAuthenticated,
    ],
  );

  return <UserPrefsContext.Provider value={value}>{children}</UserPrefsContext.Provider>;
}
