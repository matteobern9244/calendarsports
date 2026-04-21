import { Sun, Moon, Palette } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePreferencesPanel } from "@/contexts/PreferencesPanelContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/useTheme";

export default function PreferencesPanel() {
  const { open, setOpen } = usePreferencesPanel();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

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
            Personalizza il tema dell'interfaccia.
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
