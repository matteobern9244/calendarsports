import { useState, useCallback } from "react";

const STORAGE_KEY = "cse-seasons";

interface SeasonPreferences {
  sinner: number;
  juventus: number;
  f1: number;
  motogp: number;
}

const currentYear = new Date().getFullYear();

const defaults: SeasonPreferences = {
  sinner: Math.max(currentYear, 2026),
  juventus: Math.max(currentYear, 2026),
  f1: Math.max(currentYear, 2026),
  motogp: Math.max(currentYear, 2026),
};

function loadPreferences(): SeasonPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch {
    // Ignore malformed local storage payloads and fall back to defaults.
  }
  return defaults;
}

export function useSeasonPreferences() {
  const [seasons, setSeasons] = useState<SeasonPreferences>(loadPreferences);

  const setSeason = useCallback(
    (key: keyof SeasonPreferences, year: number) => {
      setSeasons((prev) => {
        const next = { ...prev, [key]: year };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  return { seasons, setSeason };
}
