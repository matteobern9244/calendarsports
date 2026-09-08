import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/lib/supabaseClient";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/useAuth";

type Mode = "accedi" | "registrati";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("accedi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "registrati") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account creato");
          navigate("/", { replace: true });
        } else {
          toast.success("Controlla la posta", {
            description: "Ti abbiamo inviato un'email per confermare l'indirizzo.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Accesso effettuato");
        navigate("/", { replace: true });
      }
    } catch (err) {
      toast.error("Operazione non riuscita", {
        description: err instanceof Error ? err.message : "Riprova più tardi.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Accesso non riuscito", { description: "Riprova più tardi." });
      return;
    }
    if (result.redirected) return;
    navigate("/", { replace: true });
  };

  const handleReset = async () => {
    if (!email) {
      toast.error("Inserisci prima la tua email");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reimposta-password`,
    });
    if (error) {
      toast.error("Invio non riuscito", { description: "Riprova più tardi." });
      return;
    }
    toast.success("Email inviata", {
      description: "Segui il link per scegliere una nuova password.",
    });
  };

  return (
    <div className="container py-8 sm:py-12 max-w-md">
      <SectionHeader title="Accedi" />

      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Con un account salvi tema, squadra preferita e sezioni visibili su tutti i tuoi dispositivi.
        Senza account l'applicazione funziona esattamente come adesso.
      </p>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 font-heading uppercase tracking-wider"
          disabled={busy}
          onClick={() => handleOAuth("google")}
        >
          Continua con Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 font-heading uppercase tracking-wider"
          disabled={busy}
          onClick={() => handleOAuth("apple")}
        >
          Continua con Apple
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border/60" />
        oppure
        <span className="h-px flex-1 bg-border/60" />
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger
            value="accedi"
            className="flex-1 font-heading uppercase tracking-wider text-xs"
          >
            Accedi
          </TabsTrigger>
          <TabsTrigger
            value="registrati"
            className="flex-1 font-heading uppercase tracking-wider text-xs"
          >
            Registrati
          </TabsTrigger>
        </TabsList>

        <TabsContent value={mode} forceMount>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-foreground">
                Email
              </label>
              <input
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--gold))]/60"
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-foreground">
                Password
              </label>
              <input
                className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--gold))]/60"
                id="password"
                type="password"
                autoComplete={mode === "registrati" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Almeno 6 caratteri"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="btn-gold w-full h-11 font-heading uppercase tracking-widest"
            >
              {mode === "registrati" ? "Crea account" : "Accedi"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {mode === "accedi" && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Password dimenticata?
        </button>
      )}
    </div>
  );
}
