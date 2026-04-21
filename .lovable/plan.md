

## Badge "Ora italiana" sulle pagine eventi

### Obiettivo

Aggiungere un piccolo badge informativo accanto al titolo di ogni pagina con eventi che dichiari esplicitamente: "Tutti gli orari sono in ora italiana locale" + sigla fuso corrente (`CET` da fine ottobre a fine marzo, `CEST` da fine marzo a fine ottobre), calcolata runtime così è sempre corretta.

### Dove

Pagine eventi che mostrano orari:
- `src/pages/Index.tsx` (Home — Prossimi Eventi + Stasera in TV)
- `src/pages/Formula1Page.tsx`
- `src/pages/MotoGPPage.tsx`
- `src/pages/JuventusPage.tsx`
- `src/pages/SinnerPage.tsx`
- `src/pages/StreamingPage.tsx`

### Approccio

**1. Nuovo componente `src/components/common/TimezoneBadge.tsx`**

Componente piccolo, riutilizzabile, accessibile. Mostra icona `Clock` di lucide + testo `Orari in ora italiana · CEST` (o `CET`). Tooltip su hover con messaggio esteso: "Tutti gli orari mostrati sono nel fuso Europe/Rome".

```tsx
import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function getRomeTimezoneAbbreviation(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Rome",
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tz = parts.find(p => p.type === "timeZoneName")?.value;
    // Normalizza: a volte ritorna "GMT+1"/"GMT+2" → mappiamo a CET/CEST
    if (tz === "GMT+1" || tz === "UTC+1") return "CET";
    if (tz === "GMT+2" || tz === "UTC+2") return "CEST";
    return tz || "CET";
  } catch {
    return "CET";
  }
}

export default function TimezoneBadge({ className }: { className?: string }) {
  const tz = getRomeTimezoneAbbreviation();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--gold))]/30",
              "bg-[hsl(var(--gold))]/10 px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider",
              "text-[hsl(var(--gold))]",
              className
            )}
            aria-label={`Tutti gli orari sono in ora italiana locale (${tz})`}
          >
            <Clock className="h-3 w-3" aria-hidden="true" />
            Orari in ora italiana · {tz}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Tutti gli orari mostrati sono nel fuso Europe/Rome ({tz}).
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

Note tecniche:
- Calcolo `CET`/`CEST` runtime via `Intl.DateTimeFormat` con `timeZone: "Europe/Rome"` e `timeZoneName: "short"`. Niente date hardcoded di passaggio DST.
- Stile coerente con palette oro esistente, niente colori hardcoded.
- Accessibile: `aria-label` sul wrapper, `aria-hidden` sull'icona, tooltip per screen reader.
- `Tooltip` già disponibile in `src/components/ui/tooltip.tsx`.

**2. Posizionamento nelle pagine**

Inserire il badge subito sotto/accanto al `SectionHeader` principale di ogni pagina, in modo discreto ma visibile. Esempio:

```tsx
<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
  <SectionHeader title="Formula 1" />
  <TimezoneBadge />
</div>
```

Per `Index.tsx` (Home) il badge va nella riga superiore vicino al pulsante "Sincronizza", per non aggiungere rumore alla griglia eventi.

### File modificati

| File | Modifica |
|---|---|
| `src/components/common/TimezoneBadge.tsx` | **NUOVO** — componente con `Intl.DateTimeFormat` + tooltip Radix. |
| `src/pages/Index.tsx` | Badge inline nella header row sopra "Stasera in TV". |
| `src/pages/Formula1Page.tsx` | Badge accanto a `SectionHeader`. |
| `src/pages/MotoGPPage.tsx` | Badge accanto a `SectionHeader`. |
| `src/pages/JuventusPage.tsx` | Badge accanto a `SectionHeader`. |
| `src/pages/SinnerPage.tsx` | Badge accanto a `SectionHeader`. |
| `src/pages/StreamingPage.tsx` | Badge accanto a `SectionHeader`. |
| `changelog.md` | Voce sotto Unreleased: "Aggiunto badge 'Orari in ora italiana · CET/CEST' nelle pagine eventi, sigla DST calcolata runtime via `Intl.DateTimeFormat`." |

### Cosa NON cambia

- Logica di formattazione date/orari (già su `Europe/Rome` in `dateUtils.ts` e nei singoli componenti). Il badge è solo informativo.
- Struttura pagine, route, dati, hook React Query: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Badge visibile e leggibile in light + dark.
2. Sigla mostra `CEST` ora (ad aprile 2026), `CET` automaticamente da fine ottobre.
3. Tooltip funziona con mouse + tastiera (focus).
4. Nessun overflow su mobile (badge a capo se header è stretto).
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

