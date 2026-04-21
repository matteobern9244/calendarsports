

## Rimozione nota "— Dati da Sky Sport"

### Modifica

In `src/pages/MotoGPPage.tsx`, rimuovere il `subtitle` del `SectionHeader` che dichiara la fonte dati.

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/MotoGPPage.tsx` | Rimuovere `subtitle="Calendario, classifiche e highlights — Dati da Sky Sport"`. Mantenere solo `title="MotoGP"` (coerente con F1 e Juventus). |
| `changelog.md` | Voce sotto 2.1.0: "UI: rimossa nota informativa 'Dati da Sky Sport' dalla pagina MotoGP (fonte dati invariata lato edge function)." |

### Cosa NON cambia

- Logica edge function `sports-motogp` (Sky Sport + calendario statico 2026 + mapping).
- Layout, tabs, calendario, classifiche piloti/costruttori.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/motogp` → il sottotitolo non compare più, il resto invariato.
2. `npm run lint` + `npm run build`.
3. Aggiornare `changelog.md`.
4. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

