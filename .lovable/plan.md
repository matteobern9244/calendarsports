

## Bandiera nazionalità accanto al nome pilota (MotoGP + F1)

### Approccio

Aggiungere una **mini bandiera SVG** (rettangolo ~20x14px) caricata da `https://flagcdn.com/{cc}.svg` accanto al nome pilota nella tab "Classifica Piloti" sia su MotoGP sia su F1.

- **F1**: il dato `nationality` (es. "British", "Italian") è già esposto dal backend ma **non renderizzato**. Lo mappo a country code ISO-2 nel frontend e renderizzo la bandiera.
- **MotoGP**: il dato non esiste nel backend. Aggiungo una **mappa statica `MOTOGP_RIDER_NATIONALITY_BY_SURNAME`** (stessa convenzione di `MOTOGP_RIDER_NUMBERS_BY_SURNAME`), un helper `findRiderNationality`, e il campo `nationality: string | null` (codice ISO-2 lowercase, es. `"it"`, `"es"`) nel payload `pilots`.

Pattern coerente con foto/numero/nome esistenti: tutto statico stagionale, `null` per piloti non mappati (wildcard), nessun fallback inventato.

### Modifiche

**1. `supabase/functions/sports-motogp/index.ts`**

Aggiungere mappa nazionalità (basata sulla griglia MotoGP 2026 ufficiale, ISO-2 lowercase):

```typescript
const MOTOGP_RIDER_NATIONALITY_BY_SURNAME: Record<string, string> = {
  'bagnaia': 'it',
  'marquez-m': 'es',
  'marquez-a': 'es',
  'martin': 'es',
  'acosta': 'es',
  'bastianini': 'it',
  'bezzecchi': 'it',
  'vinales': 'es',
  'quartararo': 'fr',
  'binder': 'za',
  'miller': 'au',
  'morbidelli': 'it',
  'di giannantonio': 'it',
  'fernandez-r': 'es',
  'fernandez-a': 'es',
  'zarco': 'fr',
  'marini': 'it',
  'mir': 'es',
  'rins': 'es',
  'ogura': 'jp',
  'aldeguer': 'es',
  // ... allineato 1:1 con MOTOGP_RIDER_NUMBERS_BY_SURNAME esistente
};
```

Aggiungere helper `findRiderNationality(name: string): string | null` con la stessa logica di `findRiderNumber` (gestione fratelli Marquez, Fernandez R./A., accent-insensitive). Popolare il campo:

```typescript
pilots.push({
  position: pos,
  name: expandRiderName(nameRaw),
  team: teamRaw,
  points: pts || 0,
  photoUrl: findRiderPhoto(nameRaw),
  number: findRiderNumber(nameRaw),
  nationality: findRiderNationality(nameRaw),  // NUOVO
});
```

**2. `src/pages/MotoGPPage.tsx`**

Nella tab "Piloti", aggiungere la bandiera tra il numero e il nome:

```tsx
<div className="flex items-center gap-2">
  {/* foto + badge numero come ora */}
  {s.nationality && (
    <img
      src={`https://flagcdn.com/${s.nationality}.svg`}
      alt={`Bandiera ${s.nationality.toUpperCase()}`}
      className="h-3.5 w-5 object-cover rounded-sm flex-shrink-0 border border-border/40"
      loading="lazy"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
    />
  )}
  <span className="font-semibold">{s.name}</span>
</div>
```

**3. `src/lib/f1Utils.ts` (nuovo file)**

Mini utility per convertire la `nationality` testuale F1 (Jolpica restituisce stringhe tipo `"British"`, `"Dutch"`, `"Italian"`) nel codice ISO-2 lowercase per flagcdn:

```typescript
export const F1_NATIONALITY_TO_ISO: Record<string, string> = {
  'British': 'gb', 'Dutch': 'nl', 'Australian': 'au', 'Monégasque': 'mc',
  'Monegasque': 'mc', 'Spanish': 'es', 'Mexican': 'mx', 'French': 'fr',
  'German': 'de', 'Finnish': 'fi', 'Canadian': 'ca', 'Japanese': 'jp',
  'Thai': 'th', 'Chinese': 'cn', 'American': 'us', 'Italian': 'it',
  'Argentine': 'ar', 'Brazilian': 'br', 'New Zealander': 'nz',
};
export function f1NationalityToIso(n?: string | null): string | null {
  if (!n) return null;
  return F1_NATIONALITY_TO_ISO[n.trim()] || null;
}
```

**4. `src/pages/Formula1Page.tsx`**

Nella tab "Piloti", colonna Pilota, aggiungere la bandiera prima del nome, identica per stile a MotoGP:

```tsx
{(() => {
  const iso = f1NationalityToIso(d.nationality);
  return iso ? (
    <img src={`https://flagcdn.com/${iso}.svg`} alt={`Bandiera ${iso.toUpperCase()}`}
         className="h-3.5 w-5 object-cover rounded-sm flex-shrink-0 border border-border/40"
         loading="lazy" />
  ) : null;
})()}
<div>
  <span className="font-semibold">{d.driver}</span>
  ...
</div>
```

### Verifica nazionalità

I codici vanno verificati su fonte ufficiale (motogp.com starting grid 2026, formula1.com drivers). Per piloti senza match (wildcard MotoGP, nazionalità F1 non in mappa) il campo resta `null` e la bandiera non viene renderizzata — nessun fallback inventato. La mappa F1 copre la griglia 2025-2026 e si estende facilmente con nuove righe.

### Fragilità

- **flagcdn.com**: CDN pubblico esterno, gratuito, stabile da anni. Se va down, la bandiera scompare grazie a `onError` (su MotoGP) o non viene renderizzata se l'utente ha rete lenta. Nessun impatto su dati di gara/classifica.
- **Mappa nazionalità F1**: dipende dalla stringa esatta restituita da Jolpica. Se aggiungono un pilota con nazionalità non mappata (es. "Indonesian"), bandiera assente fino ad aggiornamento mappa. Documentato nel changelog.

### File modificati

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Mappa `MOTOGP_RIDER_NATIONALITY_BY_SURNAME`, helper `findRiderNationality`, campo `nationality` nel payload `pilots`. |
| `src/pages/MotoGPPage.tsx` | Bandiera SVG flagcdn accanto al nome pilota nella tab Piloti. |
| `src/lib/f1Utils.ts` | Nuovo file con mappa `F1_NATIONALITY_TO_ISO` e helper `f1NationalityToIso`. |
| `src/pages/Formula1Page.tsx` | Bandiera SVG flagcdn accanto al nome pilota nella tab Piloti. |
| `changelog.md` | Voce sotto Unreleased: "MotoGP/F1: aggiunta bandiera nazionalità accanto al nome pilota nella classifica." |

### Cosa NON cambia

- Shape backward-compatible: `nationality` è opzionale aggiunto in MotoGP; in F1 è già presente.
- Classifiche costruttori, calendari, hook React Query, edge function `sports-f1`: invariati.
- Numero di gara MotoGP, foto piloti, nome esteso: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Deploy edge function `sports-motogp`.
2. `curl ?action=standings&season=2026` → ogni pilota mappato ha `nationality` (es. `"it"`); wildcard hanno `null`.
3. `/motogp` tab "Classifica Piloti": bandiera visibile tra numero e nome, leggibile su mobile.
4. `/formula1` tab "Classifica Piloti": bandiera visibile prima del nome, allineata stilisticamente a MotoGP.
5. Piloti senza nazionalità mappata (wildcard MotoGP, eventuale rookie F1 con nazionalità non in `F1_NATIONALITY_TO_ISO`): nessun broken image, nessun placeholder vuoto.
6. `npm run lint` + `npm run build`.
7. Aggiornare `changelog.md`.
8. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

