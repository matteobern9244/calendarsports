## Diagnosi corretta

Hai ragione: la modifica precedente è troppo restrittiva.

Dalla documentazione TMDB, per sapere cosa è disponibile su un provider in una regione bisogna usare:

- `watch_region=IT`
- `with_watch_providers=<provider_id>`
- `with_watch_monetization_types=flatrate|free|ads` o `flatrate`
- validazione finale con `/{movie|tv}/{id}/watch/providers`, leggendo `results.IT`

I link `/network/...` che avevi mandato sono utili per capire le pagine TMDB dei network, ma non rappresentano il catalogo disponibile su Disney+/Netflix/Prime/HBO in Italia. Infatti un titolo come **Daredevil** può essere disponibile su Disney+ Italia anche se non appartiene al network Disney+ `2739` o se la sua `first_air_date` è vecchia. Con l’attuale logica `with_networks=2739` + finestra data, titoli così vengono esclusi.

Altro limite importante di TMDB: l’API non espone una vera “data di ingresso su Disney+ Italia”. Le date disponibili sono date del titolo (`first_air_date`, `air_date`, `primary_release_date`, `release_date`), non “aggiunto oggi su piattaforma”. Quindi la vista deve essere onesta: “Catalogo Italia” = titoli attualmente disponibili in Italia, ordinabili/filtrabili con i campi TMDB disponibili.

## Piano di correzione

### 1. Backend: tornare a una logica provider-first ufficiale TMDB

Modifico `supabase/functions/streaming-releases/index.ts` per la action `new-italy`:

- Provider singolo:
  - Disney+ → `with_watch_providers=337&watch_region=IT`
  - Netflix → `8`
  - Prime Video → `119`
  - HBO Max → `1899`
- Provider “Tutti”:
  - query con whitelist provider mainstream italiani, oppure più query per provider e dedup.
- Monetizzazione:
  - per provider singolo: `flatrate` come vincolo principale.
  - per “Tutti”: `flatrate|free|ads`, mantenendo solo provider mainstream.
- Post-validazione obbligatoria:
  - per ogni titolo controllo `results.IT` da `/watch/providers`.
  - se è selezionato Disney+, il titolo resta solo se `results.IT.flatrate` contiene provider `337`.

Questo garantisce che i dati siano realmente per l’Italia.

### 2. Rimuovere il blocco network/company come filtro principale

Non userò più `with_networks=2739` / `with_companies=2` per decidere il catalogo Disney+ Italia.

Questi filtri potranno restare solo come eventuale arricchimento/debug interno, ma non devono determinare cosa compare nella UI. Il catalogo deve dipendere dalla disponibilità `watch/providers IT`.

### 3. Gestione corretta del filtro periodo

Il filtro “Prossimi 7/30 giorni” oggi è fuorviante per lo streaming, perché TMDB non ha la data “aggiunto alla piattaforma”.

Lo rendo coerente così:

- `Prossimi 7 giorni`, `Prossimi 30 giorni`, `Finestra estesa` filtrano sulle date TMDB del titolo.
- Se il filtro periodo produce zero o pochissimi risultati, il backend ritorna automaticamente una sezione “catalogo recente/popolare disponibile in Italia” senza far sembrare che sia una “nuova uscita della piattaforma”.
- Il messaggio UI sarà più chiaro: “TMDB non fornisce la data di ingresso su Disney+ Italia; stiamo mostrando titoli disponibili in Italia ordinati per data/popolarità.”

### 4. Ordinamento e pagine più robuste

Per evitare che titoli validi come Daredevil non appaiano perché sono più vecchi:

- recupero più pagine TMDB, non solo pagina 1;
- dedup per `type:id`;
- applico i filtri dopo l’arricchimento provider IT;
- sort default resta “Data uscita”, ma con fallback a risultati popolari quando la finestra data è vuota;
- sort “Popolarità” usa davvero `popularity.desc` lato TMDB e lato backend.

### 5. Verifica mirata su Daredevil e provider italiani

Dopo la modifica testerò direttamente la funzione backend con chiamate mirate:

- Disney+ Italia, serie, popolarità: deve includere un risultato Daredevil se TMDB lo espone in `results.IT.flatrate` per Disney+.
- Disney+ Italia, tutti i tipi, data uscita: deve restituire titoli disponibili in Italia, non solo produzioni Disney+ network 2739.
- Netflix / Prime / HBO: controllo che ogni item abbia il provider corretto in `availableProviders`.
- Filtri `kind`, `genre`, `sort`, `range`: controllo che cambino davvero il payload.

### 6. UI e documentazione

Aggiorno:

- `src/pages/StreamingPage.tsx`
  - messaggi più precisi sul limite TMDB delle date streaming;
  - mantenimento di tutti i filtri esistenti;
  - nessun ritorno della vista “Per provider”.
- `src/hooks/useStreamingData.ts`
  - eventuali flag payload più chiari (`fallbackCatalog`, `dateSource`, ecc.).
- `README.md` e `changelog.md`
  - documento che la fonte è TMDB + JustWatch via `/watch/providers`;
  - spiego che TMDB non fornisce la data esatta di ingresso nel catalogo italiano.
- `src/lib/version.ts`
  - bump versione a `2.3.4`.

## Criterio di accettazione

La correzione sarà chiusa solo se verifico che:

- Disney+ Italia non è più filtrato per soli network/company Disney;
- titoli disponibili su Disney+ Italia ma non prodotti da network Disney possono comparire;
- ogni risultato Disney+ ha `provider_id=337` in `results.IT.flatrate`;
- i filtri Tipo, Genere, Periodo e Ordinamento modificano realmente i risultati;
- non compaiono titoli senza disponibilità Italia.