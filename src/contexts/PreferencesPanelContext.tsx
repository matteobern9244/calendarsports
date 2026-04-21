import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface PreferencesPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const PreferencesPanelContext = createContext<PreferencesPanelContextValue | null>(null);

export function PreferencesPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const value = useMemo<PreferencesPanelContextValue>(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  return (
    <PreferencesPanelContext.Provider value={value}>
      {children}
    </PreferencesPanelContext.Provider>
  );
}

export function usePreferencesPanel() {
  const ctx = useContext(PreferencesPanelContext);
  if (!ctx) {
    throw new Error("usePreferencesPanel deve essere usato dentro PreferencesPanelProvider");
  }
  return ctx;
}