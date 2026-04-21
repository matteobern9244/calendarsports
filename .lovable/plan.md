

## Rimozione chip "Orari in ora italiana"

### Obiettivo

Rimuovere ovunque il chip `TimezoneBadge` ("Orari in ora italiana") senza lasciare riferimenti morti.

### Audit

Uso del componente `TimezoneBadge` nel codice:

- `src/components/common/TimezoneBadge.tsx` — definizione del componente.
- `src/pages/Index.tsx` — import + render nella toolbar in alto a destra (accanto al pulsante Sincronizza).
- `src/pages/StreamingPage.tsx` — da verificare presenza analoga (header pagina streaming).

Il chip non e' usato altrove (Sinner, Juventus, F1, MotoGP non lo importano).

### Modifiche

| File | Tipo | Modifica |
|---|---|---|
| `src/pages/Index.tsx` | EDIT | Rimuovere `<TimezoneBadge />` dalla riga toolbar e l'import `TimezoneBadge from "@/components/common/TimezoneBadge"`. Mantenere il resto della toolbar (label ultimo aggiornamento, pulsante Sincronizza, Progress) invariato. |
| `src/pages/StreamingPage.tsx` | EDIT (condizionale) | Se presente, rimuovere render + import di `TimezoneBadge` allo stesso modo. |
| `src/components/common/TimezoneBadge.tsx` | DELETE | File rimosso perche' non piu' referenziato da nessun consumer. |
| `changelog.md` | EDIT | `### Removed`: "Chip `Orari in ora italiana` rimosso da Home e Streaming. Componente `TimezoneBadge` eliminato. Nessun cambio funzionale: tutti gli orari restano formattati nel fuso `Europe/Rome` come prima." |

### Cosa NON cambia

- Formattazione orari: continua a usare `Europe/Rome` via `dateUtils` e `Intl.DateTimeFormat`.
- Layout toolbar Home: il pulsante Sincronizza e la label ultimo aggiornamento restano allineati a destra.
- Versione applicativa `2.1.0`.
- Nessun impatto su backend, dati, route, hook React Query.
- Guard CI italiano (`check-italian-ui.mjs`) invariato.

### Checklist post-edit

1. `grep -r TimezoneBadge src/` → 0 occorrenze.
2. Home `/`: toolbar in alto a destra mostra solo label "Ultimo aggiornamento ..." + pulsante Sincronizza.
3. `/streaming?tab=tv&family=rai`: nessun chip orario residuo.
4. `npm run lint` e `npm run build` invariati (nessun import non risolto).
5. `changelog.md` aggiornato.
6. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

