# Entrypoint per area funzionale

## Scopo

Usa questa mappa **dopo** aver scelto il dominio: leggi route, hook, helper e
test indicati prima di cambiare il comportamento. È una guida di orientamento e
non sostituisce la ricerca nel codice né la verifica del contratto dati reale. Si
applicano sempre anche le regole root in [`AGENTS.md`](../../AGENTS.md).

## Baseline da leggere sempre

`src/App.tsx` per l'albero dei provider e le route, `src/components/layout/Layout.tsx`
per il guscio della pagina, `src/lib/api/sportsApi.ts` per il trasporto verso le
edge function, `src/hooks/useSportsData.ts` e `src/hooks/useStreamingData.ts` per
le chiavi di cache, `src/lib/dateUtils.ts` per il fuso, `package.json` per gli
script disponibili.

## Mappa per dominio

| Area                 | Punti di ingresso da leggere                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                 | `src/pages/Index.tsx`, `components/home/TonightTvList.tsx`, `components/common/EventCard.tsx`, hook `use*NextEvent`                                                                 |
| Calendario aggregato | `src/pages/CalendarPage.tsx`, `src/hooks/useCalendarEvents.ts` (espansione F1 + MotoGP + squadra scelta, filtri persistiti), `components/calendar/sportStyles.ts`                   |
| Squadra di calcio    | `src/pages/TeamPage.tsx`, `src/pages/TeamMatchPage.tsx`, `components/common/TeamRoute.tsx`, `src/lib/teamRoutes.ts`, `sports-football`, `useFootballCalendar`, `useSerieAStandings` |
| Formula 1            | `src/pages/Formula1Page.tsx`, `sports-f1`, `src/lib/f1Utils.ts`                                                                                                                     |
| MotoGP               | `src/pages/MotoGPPage.tsx`, `sports-motogp` (Pulselive per il calendario, Sky per le classifiche)                                                                                   |
| Sinner               | `src/pages/SinnerPage.tsx`, `components/sinner/PlayerHeader.tsx`, `sports-tennis` (Wikipedia + dataset curato)                                                                      |
| Streaming e TV       | `src/pages/StreamingPage.tsx`, `src/hooks/useStreamingData.ts`, `streaming-tv`, `streaming-releases`                                                                                |
| Highlights           | `components/highlights/`, `highlights-youtube`, `useHighlights`                                                                                                                     |
| Notifiche push       | `src/lib/pushClient.ts`, `src/hooks/usePushNotifications.ts`, `push-subscribe`, `push-vapid-key`, `push-dispatcher`, `public/sw.js`                                                 |
| Preferenze e tema    | `components/preferences/PreferencesPanel.tsx`, `src/contexts/UserPrefsContext.tsx`, `src/hooks/useProfile.ts`, `src/hooks/useTheme.ts`                                              |
| Accesso e profilo    | `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `src/hooks/useProfile.ts`, tabella `profiles` (RLS sulla propria riga)                                                    |
| Squadra di Serie A   | `src/lib/serieATeams.ts` e la copia `supabase/functions/_shared/serieATeams.ts` con il guardiano anti-divergenza, `components/preferences/TeamSelect.tsx`                           |
| Sincronizzazione     | `src/hooks/useSyncAll.ts`, `src/hooks/syncWarning.ts`                                                                                                                               |
| Conto alla rovescia  | `src/lib/countdownClock.ts`, `src/hooks/useNow.ts`, `components/common/EventCountdown.tsx`                                                                                          |
| Stato offline        | `src/hooks/useOnlineStatus.ts`, `components/common/OfflineFallback.tsx`, `OfflineIndicator.tsx`                                                                                     |

## File e contratti speciali

Quando l'intervento tocca una di queste aree, i file da leggere sono nominati qui
perché **non sono deducibili dal nome della pagina**.

- **Orologio condiviso**: `src/lib/countdownClock.ts` è uno store esterno con un
  solo timer per tutta l'app, che rallenta a 30 secondi se nessuno chiede la
  risoluzione al secondo e si ferma quando la scheda passa in background. Si
  legge con `useNowMinute` / `useNowSecond`, mai con `Date.now()` nel render.
- **Evidenziazione del "prossimo"**: `prioritizeNextUpcoming` in
  `src/lib/dateUtils.ts` è l'unico punto che decide quale evento va in testa.
  Considera in corso un evento nelle tre ore dall'inizio quando non c'è una fine
  dichiarata.
- **L'elenco delle squadre vive in due copie**: `src/lib/serieATeams.ts` per
  l'app e `supabase/functions/_shared/serieATeams.ts` per le edge function, che
  girano su Deno e vengono impacchettate con il solo contenuto di
  `supabase/functions/`. Un guardiano confronta i due elenchi: senza, una
  squadra aggiunta da una parte sola produrrebbe una tendina che offre una
  squadra che l'edge function rifiuta con `400`. Il confronto fra nomi è per
  **uguaglianza esatta**, mai per sottostringa: in Coppa Italia gioca la Juve
  Stabia.
- **La preferenza grezza si ferma al contesto**: `favoriteTeam` di
  `useUserPrefs` è una `SerieATeam` già risolta, non una stringa. Dettagli e
  motivo in [`architecture-and-boundaries.md`](architecture-and-boundaries.md).
- **Chi legge la preferenza e chi legge l'indirizzo**: Home, `/calendario` e
  `/streaming` non hanno una squadra nella URL e prendono `favoriteTeam`;
  `/squadra/:teamSlug` prende quella dell'indirizzo. `Header` fa entrambe le
  cose, con l'indirizzo che vince quando c'è. Il guardiano sulle prime tre è
  `src/pages/syncTeam.test.tsx`: una squadra sbagliata lì non produce nessun
  errore, solo un «Sincronizza» che aggiorna la cache di un'altra.
- **Identità di una partita**: `buildMatchId` in
  `supabase/functions/sports-football/index.ts` costruisce lo slug usato come
  parametro di `/squadra/:teamSlug/partite/:matchId`. Cambiarlo rompe i link
  salvati.
- **Le due forme di paginazione**: descritte in
  [`architecture-and-boundaries.md`](architecture-and-boundaries.md). Chi legge un
  calendario deve accettare sia l'array nudo sia l'inviluppo `{ items }`.
- **Distinzione live / degradato**: `meta.dataSource` prodotto dalle edge
  function, interpretato da `src/hooks/syncWarning.ts`. `streaming-tv` e
  `streaming-releases` non lo emettono.
- **Finestra di prima serata**: `isPrimeTime` in
  `supabase/functions/streaming-tv/index.ts` tiene i programmi che iniziano fra le
  19 e la mezzanotte di Roma; la sovrapposizione con la fascia e il wrap dopo
  mezzanotte sono gestiti in `components/home/TonightTvList.tsx` e coperti da
  `TonightTvList.overlap.test.tsx`.

## Mappa completa delle route

- `/` → `src/pages/Index.tsx`: prossimi eventi da tutte le sezioni più la scheda
  "Stasera in TV".
- `/calendario` → `src/pages/CalendarPage.tsx`: vista mese e agenda con filtri per
  sport.
- `/streaming` → `src/pages/StreamingPage.tsx`: palinsesto serale per famiglia e
  nuove uscite del catalogo italiano.
- `/sinner` → `src/pages/SinnerPage.tsx`: profilo, risultati paginati, calendario
  tornei.
- `/squadra/:teamSlug` → `src/pages/TeamPage.tsx`: calendario paginato,
  classifica Serie A, highlights della squadra nell'indirizzo.
- `/squadra/:teamSlug/partite/:matchId` → `src/pages/TeamMatchPage.tsx`:
  dettaglio di una partita, raggiungibile anche via deep-link. Sta **dentro** il
  ramo della squadra da cui la si apre: la stessa Juventus-Napoli ha due
  indirizzi, e ognuno dice da quale calendario si è arrivati.
- `/juventus` e `/juventus/partite/:matchId` → redirect ai due indirizzi qui
  sopra, con `replace`. Sono stati condivisi e indicizzati per anni.
- `/formula1` → `src/pages/Formula1Page.tsx`: calendario GP, classifiche piloti e
  costruttori.
- `/motogp` → `src/pages/MotoGPPage.tsx`: calendario weekend, classifiche piloti e
  costruttori.
- `/preferenze` → `src/pages/PreferencesPage.tsx`: apre il pannello preferenze e
  rimanda alla Home.
- `*` → `src/pages/NotFound.tsx`: unica route fuori dal `Layout`.
