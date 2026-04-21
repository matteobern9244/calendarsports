import { useEffect, useState, type SVGProps, type ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Sun, Moon, Palette, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import SeasonSelector from "@/components/common/SeasonSelector";
import { cn } from "@/lib/utils";
import { usePreferencesPanel } from "@/contexts/PreferencesPanelContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";
import {
  useSeasonPreferences,
  type SeasonKey,
} from "@/hooks/useSeasonPreferences";
import {
  TennisBrandIcon,
  JuveBrandIcon,
  F1BrandIcon,
  MotoGPBrandIcon,
} from "@/components/layout/BrandIcons";

interface SportConfig {
  key: SeasonKey;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
}

const SPORTS: SportConfig[] = [
  { key: "sinner", label: "Jannik Sinner", Icon: TennisBrandIcon },
  { key: "juventus", label: "Juventus", Icon: JuveBrandIcon },
  { key: "f1", label: "Formula 1", Icon: F1BrandIcon },
  { key: "motogp", label: "MotoGP", Icon: MotoGPBrandIcon },
];

const SAVED_TIMEOUT_MS = 1800;

export default function PreferencesPanel() {
  const { open, setOpen } = usePreferencesPanel();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { seasons, setSeason, resetSeasons } = useSeasonPreferences();
  const [savedKeys, setSavedKeys] = useState<Set<SeasonKey>>(new Set());

  useEffect(() => {
    if (!open) setSavedKeys(new Set());
  }, [open]);

  const flagSaved = (key: SeasonKey) => {
    setSavedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    window.setTimeout(() => {
      setSavedKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, SAVED_TIMEOUT_MS);
  };

  const handleSelect = (sport: SportConfig, year: number) => {
    if (year === seasons[sport.key]) return;
    setSeason(sport.key, year);
    flagSaved(sport.key);
    toast.success(`Stagione ${sport.label} aggiornata`, {
      description: `Ora impostata su ${year}.`,
    });
  };

  const handleReset = () => {
    resetSeasons();
    SPORTS.forEach((s) => flagSaved(s.key));
    toast("Preferenze ripristinate", {
      description: "Tutte le stagioni sono tornate ai valori predefiniti.",
    });
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
            Personalizza tema e stagioni predefinite. Salvate sul tuo dispositivo.
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

          {/* Stagioni */}
          <section aria-labelledby="pref-seasons">
            <h3
              id="pref-seasons"
              className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                <CalendarDays className="h-3.5 w-3.5" />
              </span>
              Stagioni predefinite
            </h3>

            <ul className="space-y-2">
              {SPORTS.map((sport) => {
                const { Icon } = sport;
                const current = seasons[sport.key];
                const saved = savedKeys.has(sport.key);
                return (
                  <li
                    key={sport.key}
                    className={cn(
                      "rounded-xl border border-border/60 bg-background/40 p-4",
                      "transition-colors hover:border-[hsl(var(--gold))]/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-heading uppercase tracking-wider text-foreground truncate">
                            {sport.label}
                          </p>
                          <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">
                            Stagione attuale
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-2xl font-heading font-bold leading-none text-gold-gradient">
                          {current}
                        </span>
                        <AnimatePresence>
                          {saved && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.18 }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                                "border border-success/40 bg-success/10",
                                "text-[9px] font-heading font-semibold uppercase tracking-wider text-success"
                              )}
                              role="status"
                              aria-live="polite"
                            >
                              <Check className="h-2.5 w-2.5" aria-hidden="true" />
                              Salvato
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-border/40 pt-3">
                      <SeasonSelector
                        currentSeason={current}
                        onSelect={(year) => handleSelect(sport, year)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Footer sticky */}
        <div className="border-t border-border/50 bg-card/95 px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Preferenze salvate sul tuo dispositivo.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2 border-[hsl(var(--gold))]/40 hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10 ml-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Ripristina
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}