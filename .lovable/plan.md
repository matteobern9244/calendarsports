

## Colori brand costruttori MotoGP nella classifica

### Approccio

Aggiungere un **colore brand per ciascun costruttore** (Ducati rosso, Aprilia nero/rosso, KTM arancione, Yamaha blu, Honda rosso scuro) e usarlo come **bordo + sfondo soft** del contenitore del logo nella tab "Classifica Costruttori" MotoGP.

Coerente con il pattern esistente: il backend già normalizza i team al loro **constructor canonico** via `getTeamConstructor()` (es. "Pramac" → `ducati`, "Trackhouse" → `aprilia`, "Tech3" → `ktm`). Riusiamo la stessa funzione per esporre anche un campo `constructor: string | null` nel payload, e il frontend mappa quel constructor a una palette statica.

### Modifiche

**1. `supabase/functions/sports-motogp/index.ts`**

Esporre il constructor canonico nel payload teams:

```typescript
teams.push({
  position: pos,
  team: teamName,
  points: pts || 0,
  logoUrl: constructor ? (MOTOGP_CONSTRUCTOR_LOGOS[constructor] || null) : null,
  constructor: constructor,  // NUOVO: 'ducati' | 'aprilia' | 'ktm' | 'yamaha' | 'honda' | null
});
```

Nessuna nuova mappa lato backend: il colore è una decisione di presentazione, vive solo nel frontend.

**2. `src/pages/MotoGPPage.tsx`**

Aggiungere mappa colori brand in cima al file (HEX coerenti con identità visiva ufficiale dei costruttori):

```tsx
const MOTOGP_CONSTRUCTOR_COLORS: Record<string, { border: string; bg: string }> = {
  ducati:  { border: '#CC0000', bg: 'rgba(204, 0, 0, 0.08)' },      // Rosso Ducati
  aprilia: { border: '#000000', bg: 'rgba(0, 0, 0, 0.06)' },        // Nero Aprilia
  ktm:     { border: '#FF6600', bg: 'rgba(255, 102, 0, 0.10)' },    // Arancione KTM
  yamaha:  { border: '#003DA5', bg: 'rgba(0, 61, 165, 0.08)' },     // Blu Yamaha
  honda:   { border: '#E40521', bg: 'rgba(228, 5, 33, 0.08)' },     // Rosso Honda
};
```

Modifica del rendering del logo nella tab costruttori (riga 173-181): wrappare l'`<img>` in un contenitore con bordo + sfondo soft basati su `c.constructor`. Quando `constructor` è `null` (team non riconosciuto), si usa lo stile neutro attuale.

```tsx
<div className="flex items-center gap-3">
  <div
    className="h-10 w-14 rounded-md border-2 flex items-center justify-center flex-shrink-0 p-1"
    style={
      c.constructor && MOTOGP_CONSTRUCTOR_COLORS[c.constructor]
        ? {
            borderColor: MOTOGP_CONSTRUCTOR_COLORS[c.constructor].border,
            backgroundColor: MOTOGP_CONSTRUCTOR_COLORS[c.constructor].bg,
          }
        : { borderColor: 'hsl(var(--border))' }
    }
  >
    {c.logoUrl && (
      <img
        src={c.logoUrl}
        alt={c.team}
        className="h-full w-full object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    )}
  </div>
  <span className="font-semibold">{c.team}</span>
</div>
```

### Scelte di stile

- **Bordo + sfondo soft** insieme: colore brand riconoscibile a colpo d'occhio, ma non aggressivo. Lo sfondo è ad alpha bassa (~0.08–0.10) per non dominare la riga né disturbare la leggibilità.
- **Colori inline via `style`**: usiamo HEX/rgba inline per i colori brand perché non sono semantic tokens del design system (sono identità di terzi). Coerente con come il progetto già usa colori dei team Juve/F1 dove serve.
- **Wrapper a dimensione fissa** (`h-10 w-14`): logo sempre allineato e cornice sempre visibile anche se l'immagine fallisce a caricare (`onError` nasconde solo l'`<img>`, il bordo brand resta).

### File modificati

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Aggiunto campo `constructor: string \| null` nel payload `teams` (riusando `getTeamConstructor`). |
| `src/pages/MotoGPPage.tsx` | Mappa locale `MOTOGP_CONSTRUCTOR_COLORS`, wrapper colorato attorno al logo nella tab costruttori. |
| `changelog.md` | Voce sotto Unreleased: "MotoGP: aggiunti colori brand costruttori (bordo + sfondo soft) accanto al logo nella classifica costruttori." |

### Cosa NON cambia

- Shape backward-compatible: `constructor` è opzionale aggiunto. La tab Piloti, calendario, next-event, classifica F1: invariati.
- Nessuna modifica a foto/numero/bandiera piloti.
- Nessuna nuova dipendenza npm o nuovo asset esterno.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Deploy edge function `sports-motogp`.
2. `curl ?action=constructor-standings&season=2026` → ogni team ha `constructor` valorizzato (`ducati`/`aprilia`/`ktm`/`yamaha`/`honda`) o `null` per team non riconosciuti.
3. `/motogp` tab "Classifica Costruttori": logo dentro cornice colorata brand, leggibile su mobile e desktop. Team senza constructor mappato mostrano cornice neutra `--border`.
4. Loghi che falliscono il caricamento: cornice colorata brand resta visibile, nessun layout shift.
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

