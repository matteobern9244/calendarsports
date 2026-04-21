

## Rimozione nota "Dati reali da Jolpica/Ergast API"

### Modifica

In `src/pages/Formula1Page.tsx`, rimuovere la parte di `subtitle` del `SectionHeader` che dichiara la fonte dati.

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/Formula1Page.tsx` | Rimuovere `subtitle="Calendario, classifiche e highlights — Dati reali da Jolpica/Ergast API"`. Mantenere solo `title="Formula 1"` (coerente con quanto già fatto su `JuventusPage`). |
| `changelog.md` | Voce sotto 2.1.0: "UI: rimossa nota informativa 'Dati reali da Jolpica/Ergast API' dalla pagina F1 (fonte dati invariata lato edge function)." |

### Cosa NON cambia

- Logica edge function `sports-f1` (Jolpica + OpenF1 + fallback statici).
- Layout, tabs, calendario, classifiche piloti/costruttori.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/formula1` → il sottotitolo non compare più, il resto invariato.
2. `npm run lint` + `npm run build`.
3. Aggiornare `changelog.md`.
4. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

