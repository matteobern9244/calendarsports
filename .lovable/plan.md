

## Foto piloti F1: garantire visibilità per tutti

### Problema reale (verificato via curl)

L'edge function `sports-f1` recupera le foto dei piloti da OpenF1 e da una mappa fallback `F1_DRIVER_PHOTOS`. Entrambe puntano al CDN ufficiale `media.formula1.com/.../<DRIVERID>/<photo>.png` con il prefisso magico `d_driver_fallback_image.png`. Questo prefisso è una direttiva Cloudinary che restituisce **una sagoma grigia placeholder (702 bytes, HTTP 200)** quando il file vero non esiste, invece di un 404.

Conseguenza: per i rookie e i piloti la cui foto ufficiale F1 non è ancora stata pubblicata (es. **Arvid Lindblad** RB 2026, **Sergio Pérez** Cadillac 2026, in futuro chiunque entri a stagione iniziata), l'`<img>` riceve una risposta 200 con immagine vuota → la cella mostra una sagoma grigia ma il fallback `<User>` icon non viene mai attivato (l'`onError` non scatta).

Inoltre nel payload 2026 **Pérez** ha `photoUrl: null` perché il `family.lastName.toLowerCase()` è `pérez` con accento e non matcha né OpenF1 (`PEREZ` → key `perez`) né alcuna entry nella mappa.

### Soluzione

Strategia a tre livelli, in ordine:

1. **OpenF1 headshot** se ritorna un URL **e** non è il pattern placeholder (escludere URL contenenti `d_driver_fallback_image.png` quando il file ha dimensione "placeholder", o più semplicemente: usare OpenF1 solo se l'URL non termina con un pattern noto vuoto — verifica via HEAD `Content-Length` non praticabile lato edge per costo, quindi si filtra euristicamente).
2. **Mappa statica `F1_DRIVER_PHOTOS`** estesa con i piloti mancanti, puntando a **foto reali Wikimedia Commons** verificate per Lindblad, Pérez (e Bottas come ridondanza già coperta da CDN ma per uniformità del rookie pool Cadillac).
3. **Normalizzazione chiave** robusta: rimuovere accenti (`pérez` → `perez`), trim, lowercase, in modo che "Pérez", "Hülkenberg", "Magnussen", ecc. matchino sempre la mappa.

Si **mantiene** il CDN F1 per i piloti consolidati (foto ufficiali alta qualità) ma si **antepone** la mappa statica quando l'URL OpenF1 corrisponde al pattern placeholder noto.

### Cambio logica edge function

In `supabase/functions/sports-f1/index.ts`, action `driver-standings`:

1. Aggiungere helper `normalizeKey(s: string)` che fa `.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()`.
2. Aggiungere helper `isLikelyPlaceholder(url: string)` che ritorna `true` se l'URL contiene `d_driver_fallback_image.png` **e** il pilota è in una whitelist di rookie/casi noti senza foto reale (`PLACEHOLDER_DRIVERS` set: `lindblad`, `perez`, e configurabile in futuro). Più semplice: se la chiave normalizzata è in `F1_DRIVER_PHOTOS` con un URL Wikimedia, **preferisci sempre la mappa statica** quando esiste, ignorando OpenF1. Questa è la regola più semplice e prevedibile.
3. Riordinare la priorità in:
   ```
   const key = normalizeKey(familyName);
   const photoUrl = F1_DRIVER_PHOTOS[key] || headshotMap[key] || null;
   ```
   (mappa statica vince su OpenF1 quando definita).
4. Estendere `F1_DRIVER_PHOTOS` con entry verificate per:
   - `lindblad` → Wikimedia Commons (foto Melbourne 2025 verificata 200 OK).
   - `perez` → Wikimedia Commons (foto driver parade verificata 200 OK).
   - `bottas` → URL CDN F1 esistente (già 4711 bytes, foto reale) come ridondanza esplicita.

Questo approccio è preferibile a uno scan `Content-Length` lato edge perché:
- Non aggiunge HEAD requests extra (latenza).
- È deterministico e auditable nel codice.
- Permette di aggiungere nuovi rookie semplicemente estendendo la mappa.

### UI fallback hardening

In `src/pages/Formula1Page.tsx` (riga ~94-100), l'`<img>` mostra l'icona `<User>` solo se `photoUrl` è null. Aggiungere `onError` handler che, se la foto fallisce a caricarsi, sostituisce l'`<img>` con il placeholder icon (toggle via stato locale o swap a `User` icon). Implementazione minimale: aggiungere `onError={(e) => e.currentTarget.src = '/placeholder.svg'}` come safety net per future rotture CDN.

Nota: questo NON risolve il caso "200 placeholder vuoto" (il browser non considera errore una immagine 200), ma protegge contro rotture future.

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-f1/index.ts` | Aggiungere `normalizeKey`, estendere `F1_DRIVER_PHOTOS` con `lindblad` + `perez` + `bottas` (URL Wikimedia verificati), invertire priorità: mappa statica → OpenF1 → null. |
| `src/pages/Formula1Page.tsx` | Aggiungere `onError` handler all'`<img>` foto pilota come safety net. |
| `changelog.md` | Voce sotto Unreleased: "Formula 1: foto pilota — risolto placeholder vuoto per rookie 2026 (Lindblad, Pérez), normalizzazione accenti nelle chiavi, mappa statica prioritaria su OpenF1 quando definita." |

### Cosa NON cambia

- Endpoint Jolpica e shape risposta `driver-standings`.
- Foto dei 21+ piloti già correttamente serviti dal CDN F1.
- Logica costruttori (loghi).
- Versione resta **2.1.0**.

### Rischi

- Wikimedia per foto pilota può cambiare URL se Wikipedia rinomina il file. Mitigato dal fatto che gli URL `commons/<hash>/<file>` sono stabili e dal fallback `onError` UI.
- Se in futuro F1 pubblica foto ufficiali per Lindblad/Pérez al path attuale, la mappa statica continuerà a vincere: per tornare al CDN F1 basta rimuovere l'entry dalla mappa.

### Checklist post-edit

1. Deploy edge function `sports-f1`.
2. Curl `driver-standings?season=2026` → verificare che Lindblad e Pérez abbiano `photoUrl` Wikimedia (non più CDN F1 placeholder né `null`).
3. `/formula1` stagione 2026 → tab "Classifica Piloti": tutte le foto visibili, nessuna sagoma grigia vuota.
4. Stagione 2025 → nessuna regressione (foto identiche a prima).
5. `npm run lint` + `npm run build`.
6. Aggiornare `changelog.md`.
7. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

