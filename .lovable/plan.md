

## Filtro "Solo in arrivo" per Nuove uscite

### Problema

Quando l'edge function `streaming-releases` allarga la finestra (fallback "widened") può restituire titoli con `releaseDate` già passata. L'utente vuole un toggle per nasconderli e vedere solo le uscite future/oggi.

### Approccio

In `src/pages/StreamingPage.tsx`:

1. **Nuovo stato locale** `onlyUpcoming: boolean` (default `false` per non rompere comportamento attuale).
2. **Toggle UI**: aggiungere un `Button` (variant `outline`/`default` in base allo stato) accanto al `Select` del range, label "Solo in arrivo" con icona `CalendarClock`. Posizionato nello stesso flex row dei controlli `range`/`kindFilter`.
3. **Filtro client-side**: dopo aver ottenuto `releases` dalla query, applicare `.filter(r => daysUntilRome(r.releaseDate) >= 0)` se `onlyUpcoming` è attivo. Riusare `daysUntilRome` da `@/lib/dateUtils` (già importato indirettamente nel componente badge, da importare qui).
4. **Persistenza opzionale via querystring**: per coerenza con `range`/`kind` già persistiti in URL, aggiungere `upcoming=1` quando attivo. Riusare la logica `setSearchParams` esistente.
5. **Reset paginazione** quando il toggle cambia (come già fatto per `range`/`kindFilter`).

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/StreamingPage.tsx` | Aggiungere stato `onlyUpcoming`, toggle Button con icona, filtro client su `releases`, persistenza URL `upcoming=1`, reset `page` su cambio. |
| `changelog.md` | Voce sotto Unreleased: "Streaming: aggiunto filtro 'Solo in arrivo' nel tab Nuove uscite per nascondere release con data già passata." |

### Cosa NON cambia

- Edge function `streaming-releases` e logica fallback "widened".
- Default range, default kind, default provider.
- Layout generale, card release, dialog dettaglio.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/streaming` tab "Nuove uscite": toggle visibile, click attiva/disattiva filtro, paginazione si resetta, URL aggiornato.
2. Con toggle attivo non compaiono titoli con `releaseDate < oggi` (fuso Europe/Rome).
3. Aggiornare `changelog.md`.

