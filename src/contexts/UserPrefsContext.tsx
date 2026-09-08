import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import {
  DEFAULT_SECTIONS,
  DEFAULT_TEAM,
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
    updateProfile.mutate({
      theme,
      favorite_team: localTeam,
      show_sinner: localSections.sinner,
      show_f1: localSections.f1,
      show_motogp: localSections.motogp,
    });
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

  const favoriteTeam = profile?.favorite_team ?? localTeam ?? DEFAULT_TEAM;

  const setTheme = useCallback(
    (value: ThemeValue) => {
      setThemeLocal(value);
      if (user) updateProfile.mutate({ theme: value });
    },
    [setThemeLocal, user, updateProfile],
  );

  const setFavoriteTeam = useCallback(
    (value: string) => {
      const next = value.trim() || DEFAULT_TEAM;
      setLocalTeam(next);
      writeLocal(TEAM_STORAGE_KEY, next);
      if (user) updateProfile.mutate({ favorite_team: next });
    },
    [user, updateProfile],
  );

  const setSection = useCallback(
    (key: SectionKey, value: boolean) => {
      const base = profile
        ? { sinner: profile.show_sinner, f1: profile.show_f1, motogp: profile.show_motogp }
        : localSections;
      const next: Sections = { ...DEFAULT_SECTIONS, ...base, [key]: value };
      setLocalSections(next);
      writeLocal(SECTIONS_STORAGE_KEY, JSON.stringify(next));
      if (user) {
        updateProfile.mutate({
          show_sinner: next.sinner,
          show_f1: next.f1,
          show_motogp: next.motogp,
        });
      }
    },
    [profile, localSections, user, updateProfile],
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
