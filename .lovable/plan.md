

## Pagina dettaglio partita Juventus (solo dati reali disponibili)

### Premessa onesta sui dati

Verificato in sessione di analisi: **non esistono fonti pubbliche e gratuite** che espongano formazioni, modulo, eventi e cronaca per le partite Juventus.
- Sky Sport: nessun widget dettaglio match esposto pubblicamente (404 su tutti i tentativi).
- Lega Serie A API: solo lista partite, nessun endpoint lineup/events.
- TheSportsDB free: ritorna lo stesso lineup fake (Aston Villa) per qualunque match; timeline e stats sono Patreon-only.
- football-data.org e API-Football: richiedono API key (a pagamento o registrazione esterna).

Per rispettare la regola "no hardcoded, solo dati reali" (memoria `data-policy`), la pagina dettaglio mostra **solo le informazioni già presenti nel payload Sky del calendario** e rimanda a Sky.it per cronaca/formazioni live.

I tab richiesti vengono onorati così:
- **Anteprima**: dati pre-partita reali (data, ora Roma, stadio mancante quindi competizione, broadcaster, countdown). Sempre disponibile.
- **Risultato**: parziali e finale dal payload Sky (status `FullTime` + `homeScore`/`awayScore`). Disponibile solo per partite giocate.
- **Formazione** + **Modulo** + **Cronologia eventi**: ognuno mostra uno stato vuoto chiaro ("Dati formazione non disponibili dalla fonte gratuita") con CTA "Apri su Sky Sport" che porta al `link` reale già presente nel payload (`match.link`, es. `https://sport.sky.it/calcio/serie-a/partite/2025/giornata-2/genoa-juventus/risultato-gol`). Nessun dato finto, nessun mock.

### Implementazione

#### A. Routing — `src/App.tsx`

Aggiungere route dinamica `/juventus/partite/:matchId` che monta la nuova pagina dettaglio dentro il `Layout` esistente. Nessun cambio agli altri route.

#### B. Nuova pagina `src/pages/JuventusMatchPage.tsx`

- Recupera la partita corrente filtrando il calendario completo via hook esistente `useJuventusCalendar(season)` finchè non trova `String(m.id) === matchId`. In caso di paginazione, scorre le pagine come fa la card "Prossima Partita". Niente nuove chiamate backend, niente nuovi endpoint.
- Header partita: badge competizione, data + ora `Europe/Rome` via `formatJuventusDateTime`, nomi squadre con `<TeamLogo>`, score tipografico grande (se finita), countdown se non finita, broadcaster pill.
- `<Tabs>` con 5 trigger nell'ordine richiesto: **Anteprima** (default), **Formazione**, **Modulo**, **Risultato**, **Cronologia eventi**.
- Tutti i testi e label in italiano (rispetta `check:italian`).
- Tutte le date in `Europe/Rome` (rispetta `check:tz-juventus`).

#### C. Tab `Anteprima`

Card grid responsive con dati reali dal payload calendario:
- Competizione (badge colorato).
- Giornata / matchday se presente (`m.matchday`).
- Data e ora italiana via `formatJuventusDateTime`.
- Broadcaster (chip con `getBroadcasterStyle` per ogni canale).
- Countdown live `<EventCountdown>` se la partita non è ancora cominciata.
- Squadre (logo + nome, `vs`) e indicazione casa/trasferta per Juventus.
- Link "Approfondisci su Sky Sport" → `match.link` (target `_blank`, `rel="noopener noreferrer"`).

#### D. Tab `Risultato`

- Se `status === "FullTime"`: pannello tipografico grande con `homeScore` - `awayScore`, scaler colore (verde Juve vince, rosso perde, giallo pareggio coerente con la card calendario esistente).
- Marcatori non mostrati: non disponibili dalla fonte → micro-nota "Marcatori non disponibili dalla fonte. Apri su Sky Sport per il dettaglio." con link al `match.link`.
- Se la partita non è ancora terminata: `<EmptyState>` "Risultato non ancora disponibile" + countdown.

#### E. Tab `Formazione`, `Modulo`, `Cronologia eventi`

Tutti e tre rendono lo stesso pattern (componente condiviso interno `<UnavailableExternalSource>`):
- Stato vuoto chiaro e onesto: "Dati formazione non disponibili dalla fonte attuale." / "Modulo non disponibile dalla fonte attuale." / "Cronologia eventi non disponibile dalla fonte attuale.".
- CTA `<a>` "Vedi su Sky Sport" → `match.link`, target `_blank`.
- Spiegazione breve in `text-muted-foreground`: "Sky Sport non espone formazioni e cronaca via API pubblica gratuita.".
- Niente icone fuorvianti tipo skeleton o "loading" che possano suggerire un caricamento futuro: la mancanza è strutturale, non temporanea.

#### F. Linking dalla pagina lista — `src/pages/JuventusPage.tsx`

- Card "Prossima Partita": rendere l'intera card cliccabile come `<Link to={\`/juventus/partite/${nextMatch.id}\`}>` mantenendo lo styling (focus ring per accessibilità).
- Card calendario nella griglia: ogni `motion.div` partita avvolta da `<Link>` allo stesso pattern. `match.id` è già nel payload Sky (verificato: `"id":"2558520"`).
- Nessun cambio al backend.

#### G. Stati di errore e edge case

- `matchId` non trovato nel calendario: pagina mostra `<ErrorState message="Partita non trovata" />` con bottone "Torna al calendario" verso `/juventus`.
- `match.link` mancante (raro): nascondere CTA "Apri su Sky Sport" e mostrare solo il messaggio di indisponibilità.
- Loading: `<LoadingState message="Caricamento dettaglio partita..." />` mentre la pagina contenente la partita viene fetchata.

### File modificati

| File | Tipo | Modifica |
|---|---|---|
| `src/pages/JuventusMatchPage.tsx` | NEW | Pagina dettaglio con header + 5 tab. Risolve la partita via `useJuventusCalendar` (paginato finché trova `String(m.id) === matchId`). Usa `formatJuventusDateTime`, `<TeamLogo>`, `<EventCountdown>`, `getBroadcasterStyle`. |
| `src/App.tsx` | EDIT | Aggiungere `<Route path="/juventus/partite/:matchId" element={<JuventusMatchPage />} />` dentro il `<Layout>`. |
| `src/pages/JuventusPage.tsx` | EDIT | Wrappare card "Prossima Partita" e ogni card calendario in `<Link to={\`/juventus/partite/${m.id}\`}>` preservando il layout e lo styling motion. |
| `src/components/common/UnavailableExternalSource.tsx` | NEW | Stato vuoto riusabile con messaggio italiano + CTA "Apri su Sky Sport" se `link` presente. Usato dai 3 tab Formazione / Modulo / Cronologia eventi. |
| `changelog.md` | EDIT | `### Added`: pagina dettaglio partita Juventus con 5 tab (Anteprima, Formazione, Modulo, Risultato, Cronologia eventi). Tab senza fonte dati gratuita rimandano a Sky Sport. |
| `README.md` | EDIT | Sezione Juventus: nota esplicita che lineup/modulo/eventi non sono disponibili dalla fonte gratuita Sky/Lega; la pagina dettaglio mostra solo dati reali (data, score, broadcaster) e linka a Sky.it. |

### Cosa NON cambia

- Nessuna modifica alle Edge Functions: tutto deriva dal payload `sports-football?action=calendar` esistente.
- Nessuna nuova dipendenza npm.
- Nessuna API key aggiunta.
- Nessuna modifica a `useSportsData.ts`, `sportsApi.ts`, layout, header, tema.
- Branch policy invariata: lavoro su `develop`, PR verso `develop`, assegnata `@matteobern9244`.

### Validazione

1. `npm run lint`, `npm run build`, `npm run test`, `npm run check:italian`, `npm run check:tz-juventus`.
2. Apertura preview su `/juventus`:
   - Click su una card → naviga a `/juventus/partite/{id}`.
   - Tab Anteprima: dati corretti per partita futura.
   - Tab Risultato: score corretto per partita giocata, empty state per partita futura.
   - Tab Formazione / Modulo / Cronologia eventi: empty state onesto + link Sky funzionante.
3. Check su mobile (responsive): tab list scrollabile, card leggibile.
4. Accessibility: i `<Link>` hanno focus ring visibile, i tab Radix hanno aria gestita nativamente.

### Checklist post-edit

1. Route `/juventus/partite/:matchId` registrata.
2. Pagina dettaglio risolve la partita dal calendario reale.
3. Card lista cliccabili → navigano al dettaglio.
4. Tutti i 5 tab presenti nell'ordine richiesto.
5. Tab senza dati reali mostrano messaggio onesto + link Sky.
6. Date in Europe/Rome via `formatJuventusDateTime`.
7. UI completamente in italiano.
8. `changelog.md` e `README.md` aggiornati con nota onesta sulla disponibilità dati.
9. Branch `develop`, PR verso `develop`, assegnata `@matteobern9244`.

