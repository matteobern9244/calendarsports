import { Outlet } from "react-router-dom";
import Header from "./Header";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect } from "react";
import { toast } from "sonner";
import { PreferencesPanelProvider } from "@/contexts/PreferencesPanelContext";
import PreferencesPanel from "@/components/preferences/PreferencesPanel";

export default function Layout() {
  const { justReconnected } = useOnlineStatus();

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
          <Outlet />
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
