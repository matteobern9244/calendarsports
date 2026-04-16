

## Piano di implementazione — 5 richieste

### 1. Verifica badge DAZN/SKY (Juventus + Home)
Testerò la edge function `sports-football` per verificare che i dati broadcaster vengano restituiti. Se funzionano, i badge sono già implementati sia nella pagina Juventus che nella Home.

### 2. Champions League e Coppa Italia per Juventus
Attualmente il calendario Juventus mostra solo partite di Serie A (Sky Sport). Per aggiungere Champions League e Coppa Italia:
- **Edge function `sports-football`**: aggiungere nuove chiamate a Sky Sport per le competizioni UEFA Champions League e Coppa Italia (competition IDs diversi dal `21` della Serie A), unirle nel calendario e ordinare per data.
- **Frontend**: mostrare un badge con il nome della competizione (Serie A / UCL / Coppa Italia) accanto a ogni partita.
- **Home page**: il subtitle includerà la competizione corretta.
- **Sincronizza**: già coperto (invalida tutte le query).

### 3. Foto piloti mancanti — F1 e MotoGP
- **F1**: OpenF1 potrebbe non coprire tutti i piloti (riserve, stagioni passate). Aggiungere una mappa statica di fallback con headshot URLs per i piloti 2025/2026 dal CDN ufficiale F1 (come fatto per MotoGP). Il frontend mostra già la foto se `photoUrl` è presente; basta garantire che il backend la fornisca sempre.
- **MotoGP**: La mappa `MOTOGP_RIDER_PHOTOS` potrebbe non matchare tutti i nomi di Sky Sport. Migliorare la logica di matching e aggiungere eventuali piloti mancanti. Mostrare un avatar placeholder quando non c'è foto.
- **Frontend**: usare un fallback icon/avatar quando `photoUrl` è null, così non c'è mai uno spazio vuoto.

### 4. Logo scuderia in Classifica Costruttori F1
- **Edge function `sports-f1`**: nel case `constructor-standings`, aggiungere una mappa statica `constructorId → logoUrl` per i team F1 2025 (Red Bull, Ferrari, McLaren, Mercedes, etc.) usando le immagini dal CDN ufficiale o Wikipedia commons.
- **Frontend `Formula1Page.tsx`**: nella tabella Costruttori, aggiungere un `<img>` prima del nome scuderia (come già fatto per le squadre in Classifica Serie A).

### 5. Logo team in Classifica Costruttori MotoGP
- **Edge function `sports-motogp`**: nel case `constructor-standings`, aggiungere una mappa statica `teamName → logoUrl` per i team MotoGP 2026 (Ducati, Aprilia, KTM, Yamaha, Honda).
- **Frontend `MotoGPPage.tsx`**: stessa logica — aggiungere `<img>` nella tabella costruttori.

---

### Dettagli tecnici

**File modificati:**
- `supabase/functions/sports-football/index.ts` — nuovi competition IDs per UCL/Coppa Italia, merge calendario
- `supabase/functions/sports-f1/index.ts` — mappa fallback foto piloti + mappa loghi costruttori
- `supabase/functions/sports-motogp/index.ts` — mappa loghi team costruttori
- `src/pages/Formula1Page.tsx` — avatar fallback piloti + logo costruttori in tabella
- `src/pages/MotoGPPage.tsx` — avatar fallback piloti + logo costruttori in tabella
- `src/pages/JuventusPage.tsx` — badge competizione (Serie A/UCL/Coppa Italia)
- `src/pages/Index.tsx` — subtitle con competizione corretta

**Competition IDs Sky Sport (da verificare):**
- Serie A: `21`
- Champions League: da trovare tramite fetch
- Coppa Italia: da trovare tramite fetch

