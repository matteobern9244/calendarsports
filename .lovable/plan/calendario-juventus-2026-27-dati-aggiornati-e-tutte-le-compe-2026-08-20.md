# Calendario Juventus 2026/27: dati aggiornati e tutte le competizioni

## Problema verificato

Con l'inizio della stagione 2026/27 il calendario Juventus mostra dati misti:

- Il widget Sky della Serie A stagione 2026 risponde 200 (dati nuovi, corretti).
- Il widget Sky della Champions League stagione 2026 risponde 404 (calendario non ancora pubblicato).
- Il backend, quando una competizione manca, ripiega automaticamente sulla stagione precedente: per questo in pagina compaiono le partite di Champions 2025/26 gia' giocate (Dortmund, Real Madrid, Galatasaray...) mescolate alle prime di Serie A 2026/27.
- La Coppa Italia 2026 risponde 200 ma con una sola partita Juventus al momento.

Non esiste un widget Sky "squadra Juventus" unico: le partite vanno raccolte competizione per competizione.

## Cosa faremo

1. **Niente piu' partite di stagioni vecchie nel calendario.** Il fallback alla stagione precedente resta valido per la classifica, ma viene disattivato per il calendario: se una competizione non ha ancora il calendario della stagione richiesta, quella competizione viene semplicemente saltata invece di riempire la pagina con partite dell'anno scorso. Appena Sky pubblica il tabellone Champions 2026/27, le partite compaiono da sole al primo "Sincronizza".

2. **Tutte le competizioni Juventus.** Alla lista attuale (Serie A, Champions League, Coppa Italia) aggiungiamo la ricerca automatica delle altre competizioni in cui gioca la Juventus (Supercoppa Italiana, Mondiale per Club, amichevoli e qualsiasi altro torneo pubblicato da Sky per la stagione): il backend interroga un set di competizioni candidate, tiene solo quelle disponibili che contengono partite della Juventus e le unisce al calendario. Le competizioni non disponibili non generano errori.

3. **Calendario che parte dalla prossima partita.** Le partite gia' giocate della stagione in corso restano consultabili ma non sono piu' la prima cosa che si vede: la pagina Juventus apre direttamente sulla pagina che contiene la prossima partita, con un filtro "Prossime / Tutte" per rivedere anche i risultati. Stessa regola nella vista Calendario mensile/agenda, dove gli eventi passati restano ingrigiti come oggi.

4. **Sincronizzazione.** Il pulsante "Sincronizza" continua a invalidare le cache Juventus (calendario, classifica, prossima partita) e in piu' forza il ricarico di tutte le pagine del calendario usate dalla pagina /calendario, cosi' i dati mostrati sono sempre quelli appena letti dalle fonti.

## Dettagli tecnici

- `supabase/functions/sports-football/index.ts`
  - `fetchSkyWidget`: nuovo parametro `allowPreviousSeason` (default `true`), impostato a `false` per l'action `calendar`.
  - Nuova costante `CANDIDATE_COMPETITIONS` (Serie A 21, Champions 5, Coppa Italia 259 + id noti di Supercoppa, Mondiale per Club, amichevoli). Fetch in parallelo con `Promise.allSettled`, scarto dei 404 e dei modelli senza partite Juventus.
  - Il nome competizione, se non presente nella mappa statica, viene letto dal modello Sky invece di ricadere su "Altro".
  - `meta` arricchito con l'elenco delle competizioni effettivamente incluse e di quelle non ancora disponibili, per non spacciare per completo un calendario parziale.
- `src/pages/JuventusPage.tsx`: uso di `nextUpcomingIndex` (gia' presente nel payload) per la pagina iniziale, piu' toggle "Prossime / Tutte".
- `src/hooks/useSyncAll.ts`: invalidazione anche della query `["juventus","calendar-all", ...]`.
- Versione app, `changelog.md` e `README.md` aggiornati (fonte dati dichiarata come scraping Sky, con l'avvertenza che i tornei extra dipendono dalla pubblicazione dei widget).

## Limiti dichiarati

- I calendari dei tornei non ancora pubblicati da Sky (oggi: Champions 2026/27) non possono essere inventati: appariranno quando la fonte li espone.
- Le amichevoli precampionato spesso non hanno un widget Sky dedicato; se la fonte non le espone, la sezione resta vuota anziche' mostrare dati finti.
