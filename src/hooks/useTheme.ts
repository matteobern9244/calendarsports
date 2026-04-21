import { useState, useEffect, useRef } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("cse-theme") as Theme) || "dark";
    }
    return "dark";
  });

  const isFirstMount = useRef(true);

  useEffect(() => {
    const root = document.documentElement;

    // Attiva transizioni globali solo per la durata del toggle.
    // Skip al primo mount: il tema è già coerente con il DOM grazie
    // allo script anti-FOUC in index.html, e una transizione qui
    // costerebbe style recalc su tutti i nodi senza beneficio visivo.
    if (!isFirstMount.current) {
      root.classList.add("theme-transitioning");
      const timeout = window.setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 320);
      // cleanup al prossimo cambio tema rapido
      var cleanup = () => window.clearTimeout(timeout);
    }
    isFirstMount.current = false;

    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    localStorage.setItem("cse-theme", theme);

    // Sync dynamic theme-color meta for browser chrome / PWA
    const color = theme === "dark" ? "#0B1A33" : "#F5F7FA";
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]:not([media])'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggleTheme };
}
