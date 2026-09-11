import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { resolveTeam } from "@/lib/serieATeams";
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
  const { user } = useAuth();
  const { theme, setTheme: setThemeLocal } = useTheme();
  const { data: profile } = useProfile();
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
        show_sinner: localSections.sinner,
        show_f1: localSections.f1,
        show_motogp: localSections.motogp,
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

  const sections: Sections = useMemo(() => {
    if (profile) {
      return {
        sinner: profile.show_sinner,
        f1: profile.show_f1,
        motogp: profile.show_motogp,
      };
    }
    return localSections;
  }, [profile, localSections]);

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

  const setSection = useCallback(
    (key: SectionKey, value: boolean) => {
      const base = profile
        ? { sinner: profile.show_sinner, f1: profile.show_f1, motogp: profile.show_motogp }
        : localSections;
      const next: Sections = { ...DEFAULT_SECTIONS, ...base, [key]: value };
      const precedente = localSections;
      ricordaSezioni(next);
      if (!user) return;
      updateProfile.mutate(
        {
          show_sinner: next.sinner,
          show_f1: next.f1,
          show_motogp: next.motogp,
        },
        { onError: () => ricordaSezioni(precedente) },
      );
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
      isAuthenticated,
    }),
    [theme, setTheme, favoriteTeam, setFavoriteTeam, sections, setSection, isAuthenticated],
  );

  return <UserPrefsContext.Provider value={value}>{children}</UserPrefsContext.Provider>;
}
