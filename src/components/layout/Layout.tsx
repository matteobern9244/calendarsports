import { Outlet, useLocation } from "react-router";
import Header from "./Header";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect } from "react";
import { toast } from "sonner";
import { PreferencesPanelProvider } from "@/contexts/PreferencesPanelContext";
import PreferencesPanel from "@/components/preferences/PreferencesPanel";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function Layout() {
  const { justReconnected } = useOnlineStatus();
  const location = useLocation();

  useEffect(() => {
    if (justReconnected) {
      toast.success("Connessione ripristinata", {
        description: "I dati verranno aggiornati al prossimo refresh.",
      });
    }
  }, [justReconnected]);

  return (
    <PreferencesPanelProvider>
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
      </div>
    </PreferencesPanelProvider>
  );
}
