import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  PreferencesPanelContext,
  type PreferencesPanelContextValue,
} from "./usePreferencesPanel";

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
