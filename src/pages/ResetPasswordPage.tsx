import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/common/SectionHeader";
import { supabase } from "@/lib/supabaseClient";

/** Pagina raggiunta dal link inviato via email per scegliere una nuova password. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Aggiornamento non riuscito", {
        description: "Il link potrebbe essere scaduto: richiedine uno nuovo.",
      });
      return;
    }
    toast.success("Password aggiornata");
    navigate("/", { replace: true });
  };

  return (
    <div className="container py-8 sm:py-12 max-w-md">
      <SectionHeader title="Nuova password" />
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="new-password" className="text-sm text-foreground">
            Nuova password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Almeno 6 caratteri"
            className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-[hsl(var(--gold))]/60"
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="btn-gold w-full h-11 font-heading uppercase tracking-widest"
        >
          Salva password
        </Button>
      </form>
    </div>
  );
}
