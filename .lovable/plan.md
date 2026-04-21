

## Fix loghi costruttori MotoGP

### Problema

In `supabase/functions/sports-motogp/index.ts`, la mappa `MOTOGP_CONSTRUCTOR_LOGOS` (righe 126-132) contiene URL **inventati** verso `resources.motogp.pulselive.com` con hash placeholder identici (`d8e3b2f5-...`, `a8e3b2f5-...`). Nessuno di questi URL esiste realmente, quindi tutti i loghi sono rotti (404 → l'`<img>` resta vuoto perché in `MotoGPPage.tsx` non c'è gestione `onError`).

### Soluzione

1. **Sostituire gli URL fasulli con URL reali e stabili** dei loghi ufficiali dei costruttori MotoGP, presi da Wikipedia Commons (CDN affidabile, consentito hot-linking):
   - Ducati
   - Aprilia
   - KTM
   - Yamaha
   - Honda

2. **Aggiungere fallback `onError`** in `src/pages/MotoGPPage.tsx` sul tag `<img>` del logo costruttore: in caso di errore, nascondere l'immagine (così se in futuro un URL si rompe non resta uno spazio bianco rotto).

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-motogp/index.ts` | Sostituire i 5 URL nella mappa `MOTOGP_CONSTRUCTOR_LOGOS` con link Wikipedia Commons reali (formato `upload.wikimedia.org/.../<logo>.svg.png`). |
| `src/pages/MotoGPPage.tsx` | Aggiungere `onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}` sull'`<img>` del logo costruttore (riga ~177). |
| `changelog.md` | Voce sotto 2.1.0: "MotoGP: corretti URL loghi costruttori (Ducati/Aprilia/KTM/Yamaha/Honda) — gli URL precedenti erano placeholder non esistenti. Aggiunto fallback `onError` per nascondere immagini rotte." |

### Cosa NON cambia

- Logica di scraping Sky Sport, mapping `getTeamConstructor`, ordine classifica.
- Layout tabella, colonne, foto piloti.
- Versione resta **2.1.0**.

### Note di fragilità

- Wikipedia Commons è stabile ma non garantito eternamente. Il fallback `onError` evita regressioni visive future.
- Se Sky Sport introduce nuovi costruttori (es. BMW), `getTeamConstructor` restituirà `null` e non comparirà alcun logo (come oggi).

### Checklist post-edit

1. Deploy edge function `sports-motogp`.
2. `/motogp` → tab "Classifica Costruttori": tutti i loghi visibili.
3. `npm run lint` + `npm run build`.
4. Aggiornare `changelog.md`.
5. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

