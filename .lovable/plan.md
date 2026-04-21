

## Allineamento pagina Sinner: rimozione riferimento fonte dati

### Modifica

In `src/pages/SinnerPage.tsx`, riga 23, rimuovere la prop `subtitle` dal `<SectionHeader>`:

```diff
- <SectionHeader title="Jannik Sinner" subtitle="Dati da ATP Tour" />
+ <SectionHeader title="Jannik Sinner" />
```

Allineato al pattern delle altre pagine sportive (Formula1, MotoGP, Juventus) che non espongono la fonte dati nel sottotitolo dell'header.

### Pulizia messaggi secondari

Sempre in `SinnerPage.tsx`, normalizzare i messaggi di loading/empty che oggi citano "ATP Tour":

| Riga | Da | A |
|---|---|---|
| `LoadingState` Risultati | `"Caricamento risultati da ATP Tour..."` | `"Caricamento risultati..."` |
| `LoadingState` Tornei | `"Caricamento programma da ATP Tour..."` | `"Caricamento programma..."` |
| `EmptyState` Risultati | `"...Lo scraping ATP potrebbe essere limitato."` | `"Nessun risultato disponibile per la stagione {season}."` |

### File da modificare

| File | Modifica |
|---|---|
| `src/pages/SinnerPage.tsx` | Rimosso `subtitle` da `SectionHeader`; messaggi loading/empty normalizzati senza riferimenti alla fonte. |
| `changelog.md` | Voce sotto Unreleased: "Sinner: rimosso sottotitolo 'Dati da ATP Tour' dall'header e normalizzati i messaggi di loading/empty per allineamento con le altre pagine sportive." |

### Cosa NON cambia

- Card profilo pilota (ranking, nazionalità, altezza, peso, luogo nascita): invariata.
- Tabs Risultati/Tornei, `SeasonSelector`, `EventCard`, `prioritizeNextUpcoming`: invariati.
- Edge function `sports-tennis`, hook `useSinnerInfo/Results/Schedule`: invariati.
- Versione resta **2.1.0**.

### Checklist post-edit

1. `/sinner`: header mostra solo "Jannik Sinner" senza sottotitolo.
2. Stato loading: messaggi neutri senza "ATP Tour".
3. Stato empty risultati: messaggio senza riferimento allo scraping.
4. `npm run lint` + `npm run build`.
5. Aggiornare `changelog.md`.
6. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

