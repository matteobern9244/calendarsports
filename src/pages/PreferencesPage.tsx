import { useEffect, useState, type SVGProps, type ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Settings2, Sun, Moon, Palette } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/common/SectionHeader";
import SeasonSelector from "@/components/common/SeasonSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useSeasonPreferences,
  type SeasonKey,
} from "@/hooks/useSeasonPreferences";
import { useTheme } from "@/hooks/useTheme";
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

export default function PreferencesPage() {
  const { seasons, setSeason, resetSeasons } = useSeasonPreferences();
  const { theme, setTheme } = useTheme();
  const [savedKeys, setSavedKeys] = useState<Set<SeasonKey>>(new Set());

  useEffect(() => {
    document.title = "Preferenze · Calendar Events";
  }, []);

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
    <div className="container py-8 md:py-12">
      <SectionHeader
        title="Preferenze"
        subtitle="Personalizza tema e stagioni predefinite delle tue sezioni preferite. Le scelte vengono salvate sul tuo dispositivo."
      />

      {/* Sezione Aspetto: tema chiaro/scuro */}
      <Card className="mt-6 border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2.5 text-base font-heading uppercase tracking-wider">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
              <Palette className="h-4 w-4" />
            </span>
            Aspetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-heading uppercase tracking-wider text-foreground">
                Tema dell'interfaccia
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Scegli tra modalità chiara e scura.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="Tema dell'interfaccia"
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1"
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
        </CardContent>
      </Card>

      <div className="mt-8 mb-3 flex items-center gap-3">
        <h2 className="text-sm font-heading uppercase tracking-widest text-muted-foreground">
          Stagioni predefinite
        </h2>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SPORTS.map((sport) => {
          const { Icon } = sport;
          const current = seasons[sport.key];
          const saved = savedKeys.has(sport.key);
          return (
            <Card
              key={sport.key}
              className={cn(
                "relative overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm transition-colors",
                "hover:border-[hsl(var(--gold))]/40"
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base font-heading uppercase tracking-wider">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]">
                    <Icon className="h-4 w-4" />
                  </span>
                  {sport.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">
                    Stagione attuale
                  </p>
                  <p className="mt-1 text-4xl font-heading font-bold leading-none text-gold-gradient">
                    {current}
                  </p>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <SeasonSelector
                    currentSeason={current}
                    onSelect={(year) => handleSelect(sport, year)}
                  />
                </div>
                <div className="h-6">
                  <AnimatePresence>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                          "border border-success/40 bg-success/10",
                          "text-[10px] font-heading font-semibold uppercase tracking-wider",
                          "text-success"
                        )}
                        role="status"
                        aria-live="polite"
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Salvato
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--gold))]" aria-hidden="true" />
          <p>
            Le preferenze sono salvate localmente sul tuo dispositivo e applicate automaticamente alle pagine sportive.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2 border-[hsl(var(--gold))]/40 hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10"
        >
          <RotateCcw className="h-4 w-4" />
          Ripristina valori predefiniti
        </Button>
      </div>
    </div>
  );
}