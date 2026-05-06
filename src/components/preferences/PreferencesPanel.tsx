import { Sun, Moon, Palette, Zap, BatteryLow, Timer, Bell, BellOff } from "lucide-react";
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
import { usePreferencesPanel } from "@/contexts/PreferencesPanelContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import { useCountdownMode } from "@/hooks/useCountdownMode";
import { usePushNotifications, type LeadTime } from "@/hooks/usePushNotifications";

export default function PreferencesPanel() {
  const { open, setOpen } = usePreferencesPanel();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { mode: countdownMode, setMode: setCountdownMode } = useCountdownMode();
  const push = usePushNotifications();

  const LEAD_OPTIONS: Array<{ value: LeadTime; label: string }> = [
    { value: 15, label: "15 minuti prima" },
    { value: 60, label: "1 ora prima" },
    { value: 1440, label: "1 giorno prima" },
  ];

  const togglePush = async (next: boolean) => {
    if (next) {
      const res = await push.enable(push.leadTimes);
      if (res.ok) {
        toast.success("Notifiche attivate", {
          description: "Riceverai un avviso prima di ogni evento Juventus, F1 e MotoGP.",
        });
      } else if (res.reason === "denied") {
        toast.error("Permesso negato", {
          description: "Abilita le notifiche dalle impostazioni del browser e riprova.",
        });
      } else if (res.reason === "unsupported") {
        toast.error("Notifiche non supportate", {
          description: "Su iPhone installa l'app sulla schermata Home (richiede iOS 16.4 o successivo).",
        });
      } else {
        toast.error("Impossibile attivare le notifiche");
      }
    } else {
      await push.disable();
      toast.success("Notifiche disattivate");
    }
  };

  const toggleLead = async (value: LeadTime) => {
    const set = new Set(push.leadTimes);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const arr = Array.from(set).sort((a, b) => a - b) as LeadTime[];
    if (arr.length === 0) {
      toast.error("Seleziona almeno un anticipo");
      return;
    }
    await push.setLeadTimes(arr);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        id="preferences-panel"
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0 border-border/60 bg-card/95 backdrop-blur-xl",
          isMobile
            ? "h-[88vh] rounded-t-2xl sm:max-w-none"
            : "w-full sm:max-w-[520px]"
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
          <SheetDescription>
            Personalizza tema e comportamento dei countdown.
          </SheetDescription>
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    Modalità chiara o scura.
                  </p>
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
                            ? "bg-gradient-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--gold)/0.55)]"
                            : "text-muted-foreground hover:text-foreground"
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
                    Tempo reale: aggiornamenti al secondo. Risparmio: aggiornamenti al minuto, riduce il consumo CPU su dispositivi mobili.
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
                            ? "bg-gradient-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--gold)/0.55)]"
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

          {/* Notifiche push */}
          <section aria-labelledby="pref-push">
            <h3
              id="pref-push"
              className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                <Bell className="h-3.5 w-3.5" />
              </span>
              Notifiche
            </h3>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                    Notifiche push eventi sportivi
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ricevi un avviso prima di ogni partita Juventus, sessione F1 e sessione MotoGP.
                    {!push.supported && " Funzione non disponibile in anteprima."}
                  </p>
                </div>
                <Switch
                  checked={push.enabled}
                  disabled={!push.supported || push.busy}
                  onCheckedChange={togglePush}
                  aria-label="Attiva notifiche push"
                />
              </div>

              {push.enabled && push.supported && (
                <div>
                  <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                    Anticipo notifica
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_OPTIONS.map((opt) => {
                      const active = push.leadTimes.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={active}
                          disabled={push.busy}
                          onClick={() => toggleLead(opt.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5",
                            "text-xs font-heading font-semibold uppercase tracking-wider",
                            "border transition-colors",
                            active
                              ? "border-transparent bg-gradient-to-br from-[hsl(var(--gold-dark))] via-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--gold)/0.55)]"
                              : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {push.permission === "denied" && (
                <p className="flex items-start gap-2 text-xs text-destructive">
                  <BellOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Hai negato il permesso. Sblocca le notifiche dalle impostazioni del browser per questo sito.
                </p>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
