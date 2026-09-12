import { Button } from "@/components/ui/button";
import { STREAMING_FAMILIES } from "@/hooks/useStreamingData";
import type { StreamingFamilyId } from "@/lib/api/sportsApi";
import { cn } from "@/lib/utils";

/** I cinque gruppi di canali del palinsesto serale, come pillole. */
export default function FamilySelector({
  value,
  onChange,
}: {
  value: StreamingFamilyId;
  onChange: (v: StreamingFamilyId) => void;
}) {
  return (
    /* Va a capo, non in fila indiana. Una riga che scorre di lato nasconde
       meta' delle scelte dietro un gesto che nessuno sa di dover fare, e la
       barra che compare sotto lo annuncia senza renderle piu' trovabili. */
    <div className="flex flex-wrap gap-2">
      {STREAMING_FAMILIES.map((f) => (
        <Button
          key={f.id}
          size="sm"
          variant={value === f.id ? "default" : "outline"}
          aria-pressed={value === f.id}
          onClick={() => onChange(f.id)}
          className={cn(
            "rounded-full font-heading uppercase tracking-wider text-xs",
            value === f.id && "shadow-md",
          )}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
