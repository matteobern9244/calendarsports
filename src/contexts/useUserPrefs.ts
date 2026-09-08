import { createContext, useContext } from "react";

export type SectionKey = "sinner" | "f1" | "motogp";
export type Sections = Record<SectionKey, boolean>;
export type ThemeValue = "light" | "dark";

export const DEFAULT_SECTIONS: Sections = { sinner: true, f1: true, motogp: true };
export const DEFAULT_TEAM = "Juventus";

export const SECTIONS_STORAGE_KEY = "cse-sections";
export const TEAM_STORAGE_KEY = "cse-favorite-team";

export interface UserPrefsValue {
  theme: ThemeValue;
  setTheme: (value: ThemeValue) => void;
  favoriteTeam: string;
  setFavoriteTeam: (value: string) => void;
  sections: Sections;
  setSection: (key: SectionKey, value: boolean) => void;
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

export function loadLocalTeam(): string {
  if (typeof window === "undefined") return DEFAULT_TEAM;
  try {
    return window.localStorage.getItem(TEAM_STORAGE_KEY) || DEFAULT_TEAM;
  } catch {
    return DEFAULT_TEAM;
  }
}
