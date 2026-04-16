

## Findings

1. **Juventus Calendario — badge DAZN/SKY non visibili**: L'edge function `sports-football` ha una mappa `LEGA_SEASON_IDS` che copre solo fino a `'2025'`. Il `SeasonSelector` parte da `minYear=2026`, quindi la pagina richiede `season=2026`. Sky restituisce i dati (fallback alla stessa stagione 2025/26), ma la funzione `fetchBroadcasterMap` non trova l'ID per `'2026'` e restituisce broadcaster `null` per tutte le partite.

2. **Home page — nessuna info broadcaster**: L'`UpcomingEvent` non include il campo `broadcaster`, e l'`EventCard` non lo visualizza.

3. **Pulsante Sincronizza**: Funziona correttamente (invalida tutte le query), nessun intervento necessario.

---

## Piano

### 1. Fix mapping stagione nell'edge function
In `supabase/functions/sports-football/index.ts`, aggiungere `'2026'` alla mappa `LEGA_SEASON_IDS` con lo stesso ID della stagione 2025/26 (dato che Sky usa "2026" per indicare la stessa stagione). In alternativa, implementare un fallback automatico: se il seasonId non esiste per la stagione richiesta, provare `season - 1`.

### 2. Mostrare broadcaster nella Home page
In `src/pages/Index.tsx`:
- Aggiungere `broadcaster?: string` all'interfaccia `UpcomingEvent`
- Passare `nextMatch.broadcaster` quando si costruisce l'evento Juventus
- Rendere il badge DAZN/SKY nel subtitle o come children dell'`EventCard`

### Technical details
- Edge function: aggiungere entry `'2026': 'serie-a::Football_Season::1e32f55e98fc408a9d1fc27c0ba43243'` (stesso valore di `'2025'` perche e la stessa stagione 2025/26, oppure aggiungere fallback logic)
- Home page: mostrare i badge inline nel subtitle della card Juventus (es. "Serie A · Giornata 33 · DAZN")

