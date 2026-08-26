import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";

/**
 * La pagina /preferenze non renderizza più una vista a sé:
 * apre il pannello laterale globale e reindirizza alla home,
 * così l'utente può chiudere il pannello e tornare al contenuto.
 */
export default function PreferencesPage() {
  const { setOpen } = usePreferencesPanel();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(true);
    navigate("/", { replace: true });
  }, [setOpen, navigate]);

  return <Navigate to="/" replace />;
}
