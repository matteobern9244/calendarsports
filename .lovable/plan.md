

## Rimozione nota "Dati reali da Sky Sport Italia"

### Modifica

Trovare e rimuovere il testo "Dati reali da Sky Sport Italia" (e varianti simili) ovunque compaia nelle pagine sportive.

### File da modificare

| File | Modifica |
|---|---|
| File contenente la stringa (probabilmente `src/pages/JuventusPage.tsx` o `src/pages/MotoGPPage.tsx`) | Rimuovere il blocco JSX (`<p>` o `<span>`) che mostra "Dati reali da Sky Sport Italia". |
| `changelog.md` | Voce sotto 2.1.0: "UI: rimossa nota informativa 'Dati reali da Sky Sport Italia' (fonte dati invariata lato edge function)." |

### Cosa NON cambia

- Logica di scraping nelle edge functions `sports-football` / `sports-motogp` (resta Sky Sport).
- Layout, contenuti dati, classifiche, calendari.
- Versione resta **2.1.0**.

### Checklist post-edit

1. Verifica visiva sulla pagina coinvolta: la nota non compare più, il resto è invariato.
2. `npm run lint` + `npm run build`.
3. Aggiornare `changelog.md`.
4. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

