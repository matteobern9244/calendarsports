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
    <div className="-mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
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
    </div>
  );
}
