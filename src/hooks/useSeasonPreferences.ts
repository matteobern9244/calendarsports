import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "cse-seasons";
const SYNC_EVENT = "cse-seasons-changed";

export interface SeasonPreferences {
  sinner: number;
  juventus: number;
  f1: number;
  motogp: number;
}

export type SeasonKey = keyof SeasonPreferences;

const currentYear = new Date().getFullYear();

export const defaultSeasons: SeasonPreferences = {
  sinner: Math.max(currentYear, 2026),
  juventus: Math.max(currentYear, 2026),
  f1: Math.max(currentYear, 2026),
  motogp: Math.max(currentYear, 2026),
};

function loadPreferences(): SeasonPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultSeasons, ...JSON.parse(stored) };
  } catch {
    // Ignore malformed local storage payloads and fall back to defaults.
  }
  return defaultSeasons;
}

function persistAndBroadcast(next: SeasonPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write errors (quota, private mode, etc.)
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SeasonPreferences>(SYNC_EVENT, { detail: next }));
  }
}

export function useSeasonPreferences() {
  const [seasons, setSeasons] = useState<SeasonPreferences>(loadPreferences);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SeasonPreferences>).detail;
      if (detail) setSeasons(detail);
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const setSeason = useCallback(
    (key: SeasonKey, year: number) => {
      setSeasons((prev) => {
        const next = { ...prev, [key]: year };
        persistAndBroadcast(next);
        return next;
      });
    },
    []
  );

  const resetSeasons = useCallback(() => {
    setSeasons(() => {
      const next = { ...defaultSeasons };
      persistAndBroadcast(next);
      return next;
    });
  }, []);

  return { seasons, setSeason, resetSeasons };
}
