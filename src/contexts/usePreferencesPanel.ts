import { createContext, useContext } from "react";

export interface PreferencesPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const PreferencesPanelContext = createContext<PreferencesPanelContextValue | null>(null);

/**
 * Vive in un file separato dal provider perche' Fast Refresh ricarica un
 * modulo in modo diverso a seconda che esporti solo componenti o anche altro:
 * tenendo l'hook qui, il file del provider resta un modulo di soli componenti
 * e mantiene lo stato durante l'hot reload.
 */
export function usePreferencesPanel() {
  const ctx = useContext(PreferencesPanelContext);
  if (!ctx) {
    throw new Error("usePreferencesPanel deve essere usato dentro PreferencesPanelProvider");
  }
  return ctx;
}
