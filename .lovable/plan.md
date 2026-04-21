

## Numero di gara piloti MotoGP nella classifica

### Approccio

Aggiungere una **mappa statica `MOTOGP_RIDER_NUMBERS`** in `supabase/functions/sports-motogp/index.ts` keyed per cognome (stessa convenzione di `MOTOGP_RIDER_PHOTOS_BY_SURNAME` e `MOTOGP_RIDER_FULL_NAMES`), arricchire ogni riga della classifica piloti con `number: number | null`, e mostrarlo nella UI come **badge tondo dorato** accanto alla foto del pilota.

Approccio coerente con il resto del codice: i numeri di gara sono dati statici stagionali (cambiano solo a inizio anno o per sostituzioni), non un dato live. Stessa filosofia di calendario, foto e nomi completi.

### Modifiche

**1. `supabase/functions/sports-motogp/index.ts`**

Aggiungere mappa numeri (basata sulla griglia MotoGP 2026 ufficiale):

```typescript
const MOTOGP_RIDER_NUMBERS_BY_SURNAME: Record<string, number> = {
  'bagnaia': 63,
  'marc marquez': 93,
  'alex marquez': 73,
  'martin': 89,
  'acosta': 31,
  'bastianini': 23,
  'bezzecchi': 72,
  'vinales': 12,
  'viñales': 12,
  'quartararo': 20,
  'binder': 33,
  'miller': 43,
  'morbidelli': 21,
  'di giannantonio': 49,
  'fernandez-r': 25,
  'fernandez-a': 37,
  'fernandez': 25,
  'zarco': 5,
  'marini': 10,
  'mir': 36,
  'rins': 42,
  'ogura': 79,
  'razgatlioglu': 54,
  'aldeguer': 54, // verificare in fase di implementazione, può essere 24
  'moreira': 11,
  'garcia': 7,
  'pirro': 51,
  'savadori': 32,
};
```

Aggiungere `findRiderNumber(name: string): number | null` con la stessa logica di `findRiderPhoto` (gestione fratelli Marquez, accent-insensitive), e popolare il campo `number` nella riga del pilota:

```typescript
pilots.push({
  position: pos,
  name: expandRiderName(nameRaw),
  team: teamRaw,
  points: pts || 0,
  photoUrl: findRiderPhoto(nameRaw),
  number: findRiderNumber(nameRaw),  // NUOVO
});
```

**2. `src/pages/MotoGPPage.tsx`**

Nella tab "Piloti", colonna Pilota, mostrare il numero come badge tondo a destra della foto (o sovrapposto in basso a destra come overlay). Versione lineare proposta:

```tsx
<div className="flex items-center gap-2">
  {/* foto come ora */}
  {s.number != null && (
    <span className="font-heading font-bold text-xs text-primary bg-primary/10 rounded-full h-7 w-7 flex items-center justify-center flex-shrink-0">
      #{s.number}
    </span>
  )}
  <span className="font-semibold">{s.name}</span>
</div>
```

Niente nuova colonna in tabella per evitare overflow su mobile: il numero sta nella stessa cella del pilota.

### Verifica numeri

I numeri vanno verificati a una fonte ufficiale (motogp.com starting grid 2026) prima di committarli. Per i piloti senza match nella mappa (es. wildcard, sostituti) il campo resta `null` e il badge non viene renderizzato — nessun fallback inventato.

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Aggiunte mappa `MOTOGP_RIDER_NUMBERS_BY_SURNAME`, helper `findRiderNumber`, campo `number` nel payload `pilots`. |
| `src/pages/MotoGPPage.tsx` | Badge numero gara accanto a foto pilota nella tab Piloti. |
| `changelog.md` | Voce sotto Unreleased: "MotoGP: aggiunto numero di gara accanto al nome pilota nella classifica." |

### Cosa NON cambia

- Shape backward-compatible: `number` è un campo opzionale aggiunto (`number: number | null`); nessun consumatore esistente si rompe.
- Classifica costruttori, calendario, next-event: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Deploy edge function `sports-motogp`.
2. `curl ?action=standings&season=2026` → verificare che ogni pilota abbia un campo `number` valorizzato (o `null` per wildcard).
3. `/motogp` tab "Classifica Piloti": badge numero visibile accanto alla foto, leggibile su mobile.
4. Piloti senza numero mappato (es. wildcard occasionale) non mostrano il badge — nessun "#null" o "#undefined".
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

