import { useState } from "react";
import { Navigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/useAuth";

/**
 * Accesso con Google, e basta.
 *
 * Email e password sono state tolte nella 3.5.1: gli account esistenti sono
 * nati con Google e non hanno password, e il servizio email gratuito di
 * Supabase spedisce conferme e reset solo ai membri del team del progetto.
 * Una registrazione con email restava quindi in attesa di una conferma che non
 * sarebbe mai arrivata.
 */
export default function AuthPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  // Il login con Google passa direttamente da Supabase, non dal broker OAuth di
  // Lovable: quel broker rilascia sessioni del progetto Lovable Cloud, che il
  // progetto personale rifiuta. Il browser lascia la pagina e torna sull'app,
  // dove il client legge la sessione dall'URL e AuthContext la riceve.
  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setBusy(false);
      toast.error("Accesso non riuscito", { description: "Riprova più tardi." });
    }
  };

  return (
    <div className="container py-8 sm:py-12 max-w-md">
      <SectionHeader title="Accedi" />

      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Con un account salvi tema, squadra preferita e sezioni visibili su tutti i tuoi dispositivi.
        Senza account l'applicazione funziona esattamente come adesso.
      </p>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-heading uppercase tracking-wider"
        disabled={busy}
        onClick={handleGoogle}
      >
        Continua con Google
      </Button>
    </div>
  );
}
