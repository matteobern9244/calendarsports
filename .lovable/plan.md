# Piano: Notifiche Push PWA per eventi sportivi

## Obiettivo

Aggiungere notifiche push web (iOS 16.4+ / Android / Desktop) che avvisano l'utente prima di ogni sessione/partita di **Juventus, F1, MotoGP**. Attivazione tramite **un singolo flag globale** in Preferenze, con **timing configurabile** (15 min / 1 ora / 1 giorno prima, multi-select). La PWA già installata **non va reinstallata**: aggiungiamo solo il Service Worker e registriamo la push subscription al primo accesso.

## Decisioni chiave

- **Sinner escluso** dal flag (richiesta esplicita: solo Juventus, F1, MotoGP).
- **Web Push standard (VAPID)** — niente FCM/APNs proprietari, funziona su tutti i browser moderni inclusa Safari iOS PWA installata.
- **Manifest INVARIATO** su `start_url`, `scope`, `id`, `display` per non rompere installazioni esistenti.
- **Service Worker minimale** registrato solo in produzione e fuori dall'iframe Lovable (vincolo `<pwa>` interno).
- Backend serverless: nuova tabella `push_subscriptions` + edge function di scheduling (cron ogni 5 min) che legge il calendario e invia le push dovute.

## Architettura

```text
Browser (PWA installata)
  ├─ /sw.js  ────────────► riceve evento push, mostra notifica
  └─ Preferenze toggle
        └─ chiama edge fn `push-subscribe`
              └─ salva endpoint+keys in `push_subscriptions`

Cron pg_cron (ogni 5 min)
  └─ invoca edge fn `push-dispatcher`
        ├─ legge calendario (riusa logica useCalendarEvents lato server)
        ├─ trova eventi nei prossimi 5 min/1h/1d (in base a leadTimes utenti)
        ├─ per ogni subscription attiva → web-push send (VAPID)
        └─ marca evento+sub+leadTime come "inviato" in `push_sent_log`
```

## Modifiche Frontend

### 1. PWA / Service Worker (senza vite-plugin-pwa)
- **`public/sw.js`** (nuovo, statico, ~40 righe): handler `push` → `self.registration.showNotification(title, { body, icon, data: { url } })`; handler `notificationclick` → apre/focalizza il client sull'`url`.
- **`src/lib/pushClient.ts`** (nuovo): registrazione SW, helper `subscribeToPush()`, `unsubscribeFromPush()`, `getPermissionState()`. Guard anti-iframe e anti-host preview Lovable. Conversione VAPID public key base64URL→Uint8Array.
- **`src/main.tsx`**: chiamata one-shot `registerSW()` solo se `!isPreviewHost && !isInIframe && 'serviceWorker' in navigator`.
- **Manifest invariato** — nessun cambio a `manifest.webmanifest`.

### 2. Pagina Preferenze
- Estensione di **`src/components/preferences/PreferencesPanel.tsx`**: nuova sezione "Notifiche" con:
  - Switch globale "Notifiche push eventi sportivi" (Juventus + F1 + MotoGP).
  - Sotto-controlli (visibili se attivo): chip multi-select timing **15 min / 1 ora / 1 giorno prima** (default: 1 ora).
  - Stato esplicito: "permesso negato" (link alle impostazioni browser), "non supportato" (es. Safari desktop iOS <16.4).
- **`src/hooks/usePushNotifications.ts`** (nuovo): legge stato permesso, chiama `subscribeToPush()` su attivazione, persiste `leadTimes` in `localStorage` + sincronizza al backend ad ogni cambio.

### 3. Onboarding "soft"
- Su prima attivazione: toast informativo "Riceverai una notifica prima di ogni evento Juventus, F1, MotoGP".

## Modifiche Backend (Lovable Cloud)

### 1. Migrazione DB
Tabelle:
- **`push_subscriptions`**: `id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `lead_times` (int[] minuti, es. `{15,60,1440}`), `enabled` (bool), `created_at`, `last_seen_at`.
- **`push_sent_log`**: `id`, `subscription_id`, `event_id`, `lead_time`, `sent_at` — unique `(subscription_id, event_id, lead_time)` per idempotenza.

RLS: l'app è no-auth → policy `INSERT/UPDATE` aperte ma con validazione lato edge function (rate-limit per endpoint, sanitizzazione). `SELECT` chiuso (solo service role lato edge fn).

### 2. Edge Functions
- **`push-subscribe`**: upsert subscription (per endpoint), aggiorna `lead_times` e `enabled`. Body: `{ endpoint, keys: {p256dh, auth}, leadTimes, enabled }`.
- **`push-dispatcher`** (chiamata da cron):
  1. Carica eventi calendario aggregando le 3 fonti (riuso logica server: chiama internamente `sports-football`, `sports-f1`, `sports-motogp`).
  2. Per ogni `(subscription, leadTime)`, trova eventi che cadono nella finestra `[now + leadTime - 5min, now + leadTime]`.
  3. Skip se già in `push_sent_log`.
  4. Invia notifica via libreria web-push Deno (`https://esm.sh/web-push@3`) con VAPID.
  5. Log esito; cleanup endpoint scaduti (HTTP 410 → `enabled=false`).
- **`push-vapid-key`**: GET pubblica la VAPID public key (no secret).

### 3. Secrets
- `VAPID_PUBLIC_KEY` (pubblica, esposta via edge fn)
- `VAPID_PRIVATE_KEY` (segreta)
- `VAPID_SUBJECT` (es. `mailto:admin@rydercalendarevents.lovable.app`)

Le 3 secret vengono richieste con `add_secret`. Genero le chiavi con uno script una-tantum (`web-push generate-vapid-keys`).

### 4. Cron (pg_cron + pg_net)
Job ogni **5 minuti** che invoca `push-dispatcher`. Frequenza scelta come compromesso: copre lead time `15 min` con margine, evita over-fire.

## Compatibilità con PWA già installata

- **Nessun cambio al manifest** → installazioni iOS/Android esistenti restano valide (start_url/scope/id immutati).
- Il SW viene registrato al primo avvio successivo della PWA: l'utente vede un nuovo switch in Preferenze, lo attiva, browser chiede permesso, fine.
- iOS richiede solo che la PWA sia **installata sulla Home** (già fatto) e iOS ≥ 16.4. Non serve reinstallare.
- Su desktop e Android funziona anche da browser non-installato.

## Vincoli rispettati

- UI 100% italiano (controllo `npm run check:italian`).
- Tutte le date in `Europe/Rome` via `toRomeDate` (controllo `check:tz-juventus`).
- Token semantici per il toggle/sezione (no colori hardcoded).
- SW guarded vs iframe/preview Lovable (regola `<pwa>`).
- Scrittura su `main` solo via Lovable (regola workflow).
- `verify_jwt = false` non necessario: edge fn `push-subscribe` e `push-vapid-key` pubbliche; `push-dispatcher` chiamata solo da cron con anon key.

## File toccati

Frontend:
- `public/sw.js` *(nuovo)*
- `src/lib/pushClient.ts` *(nuovo)*
- `src/hooks/usePushNotifications.ts` *(nuovo)*
- `src/components/preferences/PreferencesPanel.tsx`
- `src/main.tsx`
- `src/lib/version.ts` → bump **v2.6.0**
- `package.json`, `changelog.md`, `README.md`

Backend:
- Migrazione: `push_subscriptions`, `push_sent_log` + RLS
- `supabase/functions/push-subscribe/index.ts` *(nuovo)*
- `supabase/functions/push-dispatcher/index.ts` *(nuovo)*
- `supabase/functions/push-vapid-key/index.ts` *(nuovo)*
- Cron job (insert su `cron.schedule`)
- Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

## Verifiche post-implementazione

1. `npm run check:italian` + `npm run check:tz-juventus` + `npm run build`.
2. Test edge fn con `curl_edge_functions`: subscribe → dispatcher dry-run.
3. Test push reale sul dispositivo dell'utente: attivazione toggle, verifica permesso, evento di test ravvicinato.
4. Verifica idempotenza: dispatcher chiamato due volte non duplica notifiche.

## Rischi noti

- **iOS Safari**: notifiche push solo se PWA è installata sulla Home Screen e iOS ≥ 16.4. Lo segnalo in UI se rilevo Safari desktop o iOS non installato.
- **Endpoint scaduti**: gestiti con cleanup automatico su HTTP 410/404.
- **Quota cron**: 1 invocazione ogni 5 min = 288/giorno, ampiamente sotto i limiti Lovable Cloud.
