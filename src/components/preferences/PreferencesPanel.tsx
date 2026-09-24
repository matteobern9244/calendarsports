import { Sun, Moon, Palette, Zap, BatteryLow, Timer, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePreferencesPanel } from "@/contexts/usePreferencesPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { MENU_SECTIONS, useUserPrefs } from "@/contexts/useUserPrefs";
import { useAuth } from "@/contexts/useAuth";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { useCountdownMode } from "@/hooks/useCountdownMode";
import TeamSelect from "@/components/preferences/TeamSelect";
import StartPageSelect from "@/components/preferences/StartPageSelect";
import { startPageLabel, type StartPage } from "@/lib/startPage";
import { resolveTeam } from "@/lib/serieATeams";
import { teamPath, teamSlugFromPath } from "@/lib/teamRoutes";

export default function PreferencesPanel() {
  const { open, setOpen } = usePreferencesPanel();
  const isMobile = useIsMobile();
  const {
    theme,
    setTheme,
    favoriteTeam,
    setFavoriteTeam,
    sections,
    setSection,
    startPage,
    setStartPage,
  } = useUserPrefs();
  const { user, signOut } = useAuth();
  const { mode: countdownMode, setMode: setCountdownMode } = useCountdownMode();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Scegliere una squadra e' un atto concluso: si salva, e il pannello si
   * chiude.
   *
   * Prima restava aperto, e finche' resta aperto il resto dell'applicazione e'
   * `aria-hidden` — Radix lo fa per tenere il fuoco dentro il pannello. Chi
   * sceglieva non vedeva cambiare niente e concludeva che servisse ricaricare.
   *
   * **E dentro una pagina squadra la preferenza da sola non basta**, ed e'
   * giusto che non basti: li' comanda l'indirizzo, altrimenti un link
   * condiviso non significherebbe niente. Restare fermi vorrebbe pero' dire
   * scegliere il Napoli e continuare a guardare la Juventus. Allora e'
   * l'indirizzo a seguire la scelta.
   *
   * La navigazione sta **qui, nel gestore**, e non in un effect: un effect
   * girerebbe anche al montaggio, e riscriverebbe l'indirizzo di un link
   * appena aperto da qualcun altro.
   *
   * Dal dettaglio di una partita si torna alla pagina della squadra e non alla
   * partita corrispondente: quella partita e' della Juventus, e per il Napoli
   * non esiste.
   */
  const scegliSquadra = (slug: string) => {
    setFavoriteTeam(slug);
    setOpen(false);
    if (teamSlugFromPath(location.pathname)) navigate(teamPath(resolveTeam(slug)));
  };

  /**
   * La pagina iniziale non cambia quello che si sta guardando adesso: cambia
   * dove si atterrera' alla prossima apertura. Il pannello resta percio'
   * aperto — al contrario della squadra, che e' una scelta conclusa — e il
   * messaggio dice esplicitamente quando avra' effetto, altrimenti chi sceglie
   * non vede succedere niente e conclude che non abbia funzionato.
   */
  const scegliPaginaIniziale = (value: StartPage) => {
    setStartPage(value);
    toast.success("Pagina iniziale aggiornata", {
      description: `Alla prossima apertura dell'app atterrerai su ${startPageLabel(value)}.`,
    });
  };


  /*
    Il pannello e' aperto a tutti: tema, squadra, voci del menu', e countdown
    vivono sul dispositivo (`localStorage`) e funzionano anche senza
    account. Chi ha effettuato l'accesso vede in piu' la pagina iniziale e la
    gestione dell'account, che senza sessione non avrebbero dove salvarsi.
  */
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        id="preferences-panel"
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0 border-border/60 bg-card/95 backdrop-blur-xl",
          isMobile ? "h-[88vh] rounded-t-2xl sm:max-w-none" : "w-full sm:max-w-[520px]",
        )}
      >
        {/* Drag handle mobile */}
        {isMobile && (
          <div className="pt-2 flex justify-center" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-border/80" />
          </div>
        )}

        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-4 text-left border-b border-border/50">
          <SheetTitle className="font-heading text-2xl uppercase tracking-tight">
            <span className="text-gold-gradient">Preferenze</span>
          </SheetTitle>
          <SheetDescription>Personalizza tema e comportamento dei countdown.</SheetDescription>
        </SheetHeader>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Aspetto */}
          <section aria-labelledby="pref-aspect">
            <h3
              id="pref-aspect"
              className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                <Palette className="h-3.5 w-3.5" />
              </span>
              Aspetto
            </h3>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                    Tema dell'interfaccia
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Modalità chiara o scura.</p>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Tema dell'interfaccia"
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 self-start"
                >
                  {(
                    [
                      { value: "light", label: "Chiaro", Icon: Sun },
                      { value: "dark", label: "Scuro", Icon: Moon },
                    ] as const
                  ).map(({ value, label, Icon }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          if (theme === value) return;
                          setTheme(value);
                          toast.success("Tema aggiornato", {
                            description:
                              value === "dark"
                                ? "Ora stai usando il tema scuro."
                                : "Ora stai usando il tema chiaro.",
                          });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
                          "text-xs font-heading font-semibold uppercase tracking-wider",
                          "transition-colors",
                          active
                            ? "bg-linear-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--gold)/0.55)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Countdown */}
          <section aria-labelledby="pref-countdown">
            <h3
              id="pref-countdown"
              className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                <Timer className="h-3.5 w-3.5" />
              </span>
              Countdown
            </h3>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                    Frequenza aggiornamento
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tempo reale: aggiornamenti al secondo. Risparmio: aggiornamenti al minuto,
                    riduce il consumo CPU su dispositivi mobili.
                  </p>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Frequenza aggiornamento countdown"
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 self-start"
                >
                  {(
                    [
                      { value: "realtime", label: "Tempo reale", Icon: Zap },
                      { value: "saver", label: "Risparmio", Icon: BatteryLow },
                    ] as const
                  ).map(({ value, label, Icon }) => {
                    const active = countdownMode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          if (countdownMode === value) return;
                          setCountdownMode(value);
                          toast.success("Countdown aggiornati", {
                            description:
                              value === "saver"
                                ? "Modalità risparmio: aggiornamenti ogni minuto."
                                : "Modalità tempo reale: aggiornamenti ogni secondo.",
                          });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
                          "text-xs font-heading font-semibold uppercase tracking-wider",
                          "transition-colors",
                          active
                            ? "bg-linear-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--gold)/0.55)]"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Account */}
          <section aria-labelledby="pref-account">
            <h3
              id="pref-account"
              className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                <UserRound className="h-3.5 w-3.5" />
              </span>
              Account
            </h3>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-4">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground break-all">
                    Accesso effettuato come{" "}
                    <span className="text-foreground">{user.email ?? "utente"}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-heading uppercase tracking-wider text-xs shrink-0"
                    onClick={async () => {
                      await signOut();
                      toast.success("Sei uscito dall'account");
                      setOpen(false);
                    }}
                  >
                    Esci
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Le preferenze si salvano su questo dispositivo. Con un account le ritrovi
                    ovunque.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-heading uppercase tracking-wider text-xs shrink-0"
                    onClick={() => {
                      setOpen(false);
                      navigate("/accedi");
                    }}
                  >
                    Accedi
                  </Button>
                </div>
              )}

              {user && (
                <div className="space-y-2">
                  <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                    Pagina iniziale
                  </p>
                  <p className="text-xs text-muted-foreground">
                    L'app si apre su questa pagina. La Home resta raggiungibile dal menù.
                  </p>
                  <StartPageSelect value={startPage} onChange={scegliPaginaIniziale} />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                  Squadra di calcio preferita
                </p>
                <TeamSelect value={favoriteTeam} onChange={scegliSquadra} />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                  Voci del menù
                </p>
                <p className="text-xs text-muted-foreground">
                  Quali voci compaiono nell'intestazione. Le pagine restano raggiungibili dal loro
                  indirizzo, così un collegamento condiviso funziona comunque.
                </p>
                {MENU_SECTIONS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Switch
                      checked={sections[key]}
                      onCheckedChange={(next) => setSection(key, next)}
                      aria-label={`Mostra la voce ${label} nel menù`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
}
