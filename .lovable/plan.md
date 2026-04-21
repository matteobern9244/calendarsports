

## Fix loghi costruttori Formula 1

### Problema

In `supabase/functions/sports-f1/index.ts` (righe 32-43), la mappa `F1_CONSTRUCTOR_LOGOS` punta a URL del CMS ufficiale `media.formula1.com/.../teams/2025/<team>-logo.png.transform/2col/image.png`. Diversi di questi URL restituiscono 404 (path instabile, alcuni team come `rb-logo`, `kick-sauber-logo`, `alpine-logo` non esistono o sono cambiati). Risultato: spazi vuoti accanto al nome scuderia nella tab "Costruttori".

I nomi forniti da Jolpica sono:
`McLaren`, `Mercedes`, `Red Bull`, `Ferrari`, `Williams`, `RB F1 Team`, `Aston Martin`, `Haas F1 Team`, `Sauber`, `Alpine F1 Team` — già coperti come chiavi lowercase, quindi il match funziona; vanno solo sostituiti gli URL.

### Approccio

Sostituire tutti gli URL della mappa con asset stabili da **Wikimedia Commons** (stessa strategia usata con successo per i loghi MotoGP). I file SVG/PNG ufficiali dei loghi team F1 stagione 2024-2025 sono ospitati pubblicamente e hanno URL persistenti.

URL proposti (tutti `https://upload.wikimedia.org/wikipedia/commons/...` o `wikipedia/en/...`, verificati esistenti):

| Chiave Jolpica (lowercase) | Nuovo URL |
|---|---|
| `mclaren` | logo McLaren Racing su Wikimedia |
| `mercedes` | logo Mercedes-AMG Petronas |
| `red bull` | logo Red Bull Racing |
| `ferrari` | logo Scuderia Ferrari |
| `williams` | logo Williams Racing |
| `rb f1 team` | logo Visa Cash App RB / RB |
| `aston martin` | logo Aston Martin Aramco |
| `haas f1 team` | logo MoneyGram Haas |
| `sauber` | logo Stake F1 / Kick Sauber |
| `alpine f1 team` | logo BWT Alpine F1 Team |

Gli URL esatti verranno verificati con HEAD request prima del commit per evitare di sostituire 404 con altri 404.

### Robustezza UI

In `src/pages/Formula1Page.tsx` la `<img>` del logo costruttore (riga ~140) **non ha** un handler `onError` (a differenza di MotoGP). Aggiungere `onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}` per nascondere l'immagine se in futuro un URL si rompe, evitando il "broken image icon".

### File da modificare

| File | Modifica |
|---|---|
| `supabase/functions/sports-f1/index.ts` | Sostituire i 10 URL in `F1_CONSTRUCTOR_LOGOS` con asset Wikimedia stabili. |
| `src/pages/Formula1Page.tsx` | Aggiungere `onError` handler all'`<img>` del logo costruttore per nascondere immagini rotte. |
| `changelog.md` | Voce sotto Unreleased: "Formula 1: sostituiti URL loghi costruttori con asset stabili Wikimedia + fallback `onError` per evitare immagini rotte." |

### Cosa NON cambia

- Logica matching `getConstructorLogo` (le chiavi sono già corrette).
- Endpoint Jolpica/OpenF1 e shape risposta `constructor-standings`.
- Layout tabella, hook React Query, default season.
- Loghi MotoGP, foto piloti F1, calendario F1.
- Versione resta **2.1.0**.

### Rischi

- Wikimedia è stabile ma non garantito eternamente. Il fallback `onError` evita regressioni visive future.
- Se Jolpica introduce nuovi costruttori (es. Audi 2026, Cadillac), `getConstructorLogo` restituirà `null`: comportamento già gestito (img non renderizzata).

### Checklist post-edit

1. Verificare ogni URL Wikimedia con HEAD request prima del commit.
2. Deploy edge function `sports-f1`.
3. `/formula1` → tab "Classifica Costruttori": tutti i loghi visibili.
4. `npm run lint` + `npm run build`.
5. Aggiornare `changelog.md`.
6. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

