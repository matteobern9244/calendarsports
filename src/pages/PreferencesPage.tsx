import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";
import { useAuth } from "@/contexts/useAuth";

/**
 * La pagina /preferenze non renderizza più una vista a sé:
 * apre il pannello laterale globale e reindirizza alla home,
 * così l'utente può chiudere il pannello e tornare al contenuto.
 */
export default function PreferencesPage() {
  const { setOpen } = usePreferencesPanel();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const puoAprire = Boolean(user);

  useEffect(() => {
    // Finche' la sessione non e' stata letta non si decide: mandare via chi ha
    // l'accesso solo perche' la risposta non e' ancora arrivata sarebbe un
    // rimbalzo all'accesso sotto gli occhi di chi e' gia' entrato.
    if (loading) return;
    if (!puoAprire) {
      navigate("/accedi", { replace: true });
      return;
    }
    setOpen(true);
    navigate("/", { replace: true });
  }, [loading, puoAprire, setOpen, navigate]);

  if (loading) return null;
  return <Navigate to={puoAprire ? "/" : "/accedi"} replace />;
}
