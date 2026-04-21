

## Verifica calendario MotoGP 2026

### Risultato verifica vs motogp.com (fonte: pagina ufficiale `motogp.com/en/calendar`, ordinamento round 1–22)

**Tutte le 22 date sono corrette.** Anche tutte le località, circuiti e country code combaciano. C'è **una sola discrepanza nel naming**: il round 4 (Jerez, 24–26 aprile) è chiamato `GP d'Andalusia` nell'array hardcoded, ma il nome ufficiale 2026 è **Gran Premio di Spagna** (l'Andalusia GP era un evento occasionale del 2020 sostituito a tutti gli effetti dal regolare GP di Spagna).

### Modifica proposta

In `supabase/functions/sports-motogp/index.ts`, riga 8 dell'array `MOTOGP_CALENDAR_2026`:

```diff
- { round: 4, name: "GP d'Andalusia", location: 'Jerez', circuit: 'Circuito de Jerez Ángel Nieto', date_start: '2026-04-24', date_end: '2026-04-26', country: 'ES' },
+ { round: 4, name: 'GP di Spagna', location: 'Jerez', circuit: 'Circuito de Jerez Ángel Nieto', date_start: '2026-04-24', date_end: '2026-04-26', country: 'ES' },
```

Nessun'altra modifica al calendario è necessaria.

### Nota sulla natura dei dati

Il calendario MotoGP resta **hardcoded** in edge function (come previsto da `AGENTS.md` e dall'istruzione `supabase.instructions.md`: questo è un dataset statico stagionale, non una fonte live). La verifica è stata fatta una tantum confrontando con la pagina ufficiale `motogp.com/en/calendar` e va ripetuta manualmente se DORNA pubblica un calendario rivisto (cambi date inverno, GP cancellati, sostituzioni come accadde nel 2020).

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Round 4: rinominare `GP d'Andalusia` → `GP di Spagna`. |
| `changelog.md` | Voce sotto Unreleased: "MotoGP: corretto nome round 4 (Jerez) da 'GP d'Andalusia' a 'GP di Spagna' allineandolo al calendario ufficiale 2026 motogp.com." |

### Cosa NON cambia

- 21 round su 22 (date, località, circuiti, country code: tutto verificato e corretto).
- Mapping foto piloti, loghi costruttori, parsing Sky Sport per le classifiche.
- Versione resta **2.1.0**.
- Nessun cambio a frontend (`MotoGPPage.tsx`), hook (`useMotoGPCalendar`), o shape payload.

### Checklist post-edit

1. Deploy edge function `sports-motogp`.
2. `curl ?action=calendar&season=2026` → verificare che il round 4 mostri `name: "GP di Spagna"` e che gli altri 21 round siano invariati.
3. `/motogp` tab "Calendario": card round 4 mostra "GP di Spagna" senza altri cambi visivi.
4. `npm run lint` + `npm run build`.
5. Aggiornare `changelog.md`.
6. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

