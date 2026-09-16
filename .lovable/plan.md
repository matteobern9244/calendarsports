# Foto giocatori affidabili e formazioni a due colonne

## Risultato

Il dettaglio partita seguirà il riferimento allegato: squadra di casa a sinistra e squadra ospite a destra, con identità, modulo e giocatori chiaramente separati in due colonne fisse sia su mobile sia su desktop.

Le foto non disponibili non mostreranno più l’icona del browser rotta: verranno sostituite automaticamente da un segnaposto coerente con lo stile dell’app.

## Interventi

1. **Protezione permanente delle immagini**
   - Gestire l’errore di caricamento delle foto dei giocatori direttamente nell’interfaccia.
   - Se Sky restituisce un indirizzo non più valido, rimuovere l’immagine fallita e mostrare il segnaposto previsto.
   - Applicare la stessa protezione agli stemmi nelle viste delle formazioni, senza richieste preventive aggiuntive e senza modificare la fonte dati.

2. **Formazioni nello stile del riferimento**
   - Creare una composizione unica con intestazione speculare: casa a sinistra, trasferta a destra.
   - Disporre sotto ciascuna squadra modulo, giocatori e informazioni correlate nella propria colonna.
   - Mantenere le due colonne anche sugli schermi piccoli, comprimendo foto e nomi senza scorrimento orizzontale.
   - Riutilizzare la stessa struttura nelle probabili formazioni, nella scheda “Formazione” e nella scheda “Modulo”, evitando differenze tra le viste.

3. **Casi incompleti**
   - Conservare l’elenco leggibile quando il modulo non permette di disegnare correttamente le linee.
   - Gestire senza rotture una sola squadra disponibile, foto assenti, nomi lunghi e stemmi non caricabili.

4. **Test e documentazione**
   - Scrivere prima i test per foto fallita e struttura casa/trasferta a due colonne.
   - Aggiornare le fixture con nomi lunghi realistici per verificare il caso mobile più difficile.
   - Aggiornare il changelog con la correzione visibile.

## Verifica

- Suite completa `bun run verify`, senza avvisi.
- Test end-to-end completi con `bun run test:e2e`.
- Controllo visivo del dettaglio Milan–Benfica su mobile e desktop.
- Controllo esplicito che nessuna pagina o formazione abbia scorrimento orizzontale.
- Verifica che una risposta 404 della foto produca il segnaposto e mai un’immagine rotta.

## Dettagli tecnici

La verifica sui dati reali ha confermato che gli indirizzi fotografici restituiti da Sky per Milan–Benfica rispondono 404, mentre il payload li espone comunque come stringhe valide. La correzione sarà quindi nel caricamento dell’immagine lato interfaccia; non verranno aggiunte verifiche di rete per ogni giocatore nella edge function e non verranno toccati database, autenticazione o altre pagine.
