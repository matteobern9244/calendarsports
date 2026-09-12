import { Button } from "@/components/ui/button";
import { STREAMING_PROVIDERS } from "@/hooks/useStreamingData";
import type { StreamingProviderId } from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";

/** Filtro per piattaforma sulle nuove uscite, con "tutte" in testa. */
export default function ItalyProviderFilter({
  value,
  onChange,
}: {
  value: StreamingProviderId | "all";
  onChange: (v: StreamingProviderId | "all") => void;
}) {
  const options: { id: StreamingProviderId | "all"; label: string }[] = [
    { id: "all", label: "Tutti" },
    ...STREAMING_PROVIDERS,
  ];
  return (
    /* Va a capo, non in fila indiana. Una riga che scorre di lato nasconde
       meta' delle scelte dietro un gesto che nessuno sa di dover fare, e la
       barra che compare sotto lo annuncia senza renderle piu' trovabili. */
    <div className="flex flex-wrap gap-2">
      {options.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant={value === p.id ? "default" : "outline"}
          aria-pressed={value === p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "rounded-full font-heading uppercase tracking-wider text-xs",
            value === p.id && "shadow-md",
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
