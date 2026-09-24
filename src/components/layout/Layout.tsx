import { Outlet, useLocation } from "@/lib/router-compat";
import Header from "./Header";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { PreferencesPanelProvider } from "@/contexts/PreferencesPanelContext";
import PreferencesPanel from "@/components/preferences/PreferencesPanel";
import SwipeToPreferences from "./SwipeToPreferences";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import TeamPalette from "@/components/common/TeamPalette";
import { useSyncAll } from "@/hooks/useSyncAll";
import { useUserPrefs } from "@/contexts/useUserPrefs";

export default function Layout() {
  const { justReconnected } = useOnlineStatus();
  const location = useLocation();
  const { favoriteTeam } = useUserPrefs();
  const { prefetchAll } = useSyncAll(favoriteTeam);

  // Tutti i dati si caricano all'arrivo sul sito, una volta per apertura:
  // cambiando pagina sono gia' pronti. «Sincronizza» resta per ricaricarli.
  const prefetchRef = useRef(prefetchAll);
  useEffect(() => {
    void prefetchRef.current();
  }, []);

  useEffect(() => {
    if (justReconnected) {
      toast.success("Connessione ripristinata", {
        description: "I dati verranno aggiornati al prossimo refresh.",
      });
    }
  }, [justReconnected]);

  return (
    <PreferencesPanelProvider>
      {/* Scrive il colore della squadra preferita su `<html>`: da li' arriva
          anche ai dialoghi, che Radix monta fuori da questo albero. */}
      <TeamPalette />
      <div className="min-h-screen flex flex-col">
        <Header />
        <OfflineIndicator />
        <main className="flex-1">
          {/* Un secondo confine attorno alla sola pagina: quello globale in
              App.tsx sostituisce l'intera applicazione con la schermata di
              errore, header compreso, e da li' si puo' solo ricaricare. Con
              questo, un errore di render resta dentro la pagina e la
              navigazione continua a funzionare. La `key` sulla route lo
              reimposta quando l'utente si sposta altrove. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="border-t border-border/50 py-6">
          <div className="container text-center text-xs text-muted-foreground">
            <span className="font-heading tracking-wider uppercase">
              {APP_NAME} · v{APP_VERSION}
            </span>
          </div>
        </footer>
        <PreferencesPanel />
        <SwipeToPreferences />
      </div>
    </PreferencesPanelProvider>
  );
}
