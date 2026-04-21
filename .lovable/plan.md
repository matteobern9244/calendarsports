

## Indicatore stato offline/online + fallback senza connessione

### Stato attuale

- L'app è una SPA React + Vite **senza PWA / service worker** (verificato: nessun `vite-plugin-pwa`, nessun `manifest.json` con `display: standalone`, esiste solo `public/manifest.webmanifest` minimale per icone).
- Le memorie di sistema indicano esplicitamente di **non aggiungere PWA** in questo progetto salvo richiesta esplicita; gli SW interferiscono con la preview Lovable iframe e causano cache stale, rotture di routing e contenuti obsoleti.
- Quindi questo intervento **non installa un service worker** e non aggiunge `vite-plugin-pwa`. Aggiunge solo l'indicatore di stato e la schermata di fallback, lavorando sugli eventi nativi `online`/`offline` del browser. Il termine "PWA" nel titolo della richiesta viene interpretato come "esperienza app-like", non come introduzione di SW.
- Se in futuro vorrai un vero PWA installabile con cache offline, va trattato come intervento separato.

### Cosa costruisco

**1. Hook `useOnlineStatus` — `src/hooks/useOnlineStatus.ts` (NUOVO)**

Wrapper su `navigator.onLine` + listener `window.addEventListener("online" | "offline")`. Espone `{ isOnline, justReconnected }`. `justReconnected` resta `true` per ~3s dopo il ritorno online, per pilotare il toast di conferma.

```ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);
  // online/offline listeners + setTimeout 3s per justReconnected
  return { isOnline, justReconnected };
}
```

**2. Componente `OfflineIndicator` — `src/components/common/OfflineIndicator.tsx` (NUOVO)**

Banner sticky in cima al `<main>`, sotto l'`Header`, visibile **solo quando offline**. Stile coerente con la palette (token semantico `--destructive` esistente). Compatto, accessibile (`role="status"`, `aria-live="polite"`), animato con Framer Motion (slide-down 180ms).

```text
┌──────────────────────────────────────────────┐
│ ⚠  Sei offline · alcuni dati potrebbero non  │
│    essere aggiornati                         │
└──────────────────────────────────────────────┘
```

Quando torna online: il banner si dissolve e parte un toast Sonner "Connessione ripristinata" verde (token `--success` già aggiunto in changelog precedente). Niente reload automatico.

**3. Componente `OfflineFallback` — `src/components/common/OfflineFallback.tsx` (NUOVO)**

Schermata di fallback grande, mostrata **solo** quando una pagina dati cruciale non ha cache React Query disponibile e l'utente è offline. Layout: icona `WifiOff` lucide, titolo "Nessuna connessione", testo esplicativo, pulsante **Riprova** che invoca un callback (di norma `queryClient.refetchQueries` o un `refetch` locale) quando torna online il pulsante diventa attivo, altrimenti è disabilitato e mostra "In attesa di connessione...".

**4. Integrazione minimale nel Layout — `src/components/layout/Layout.tsx` (EDIT)**

Aggiungo `<OfflineIndicator />` subito dopo `<Header />`. Niente altro cambia.

**5. Integrazione nelle pagine dati — pattern selettivo**

Nelle pagine eventi (`Index`, `Formula1Page`, `MotoGPPage`, `JuventusPage`, `SinnerPage`, `StreamingPage`), nel blocco di rendering già presente per `isLoading`/`error`/`empty`:

```tsx
if (isError && !isOnline && !data) {
  return <OfflineFallback onRetry={() => refetch()} />;
}
```

Solo questa riga aggiuntiva — nessuna riscrittura. Se la cache React Query ha dati (anche stale), la pagina continua a mostrarli con il banner offline in cima: questo è il pattern app-like richiesto.

**6. Toast di rientro online — gestito in `Layout.tsx`**

`useEffect` che osserva `justReconnected` e fa un `toast.success("Connessione ripristinata", { description: "I dati verranno aggiornati al prossimo aggiornamento." })`. Niente refetch automatico globale (per non scatenare valanghe di richieste alle Edge Functions); l'utente può usare il pulsante "Sincronizza" già presente in Home.

### Cosa NON cambia

- **Nessun service worker, nessun `vite-plugin-pwa`, nessun manifest aggiornato.** L'app resta una SPA standard, niente caching offline reale dei dati: se sei offline e non hai mai visitato la pagina, vedi `OfflineFallback`; se l'hai già visitata in sessione, React Query restituisce la cache in memoria e vedi i dati con il banner.
- Stack, routing, hook React Query: invariati.
- Anti-FOUC, transizioni tema, `TimezoneBadge`, pagina `/preferenze`: invariati.
- Versione resta **2.1.0**.

### Limiti dichiarati esplicitamente

- La cache React Query è in memoria, non persistente: un hard reload offline mostra `OfflineFallback`, non i dati precedenti. Per persistenza vera serve `@tanstack/react-query-persist-client` + storage, fuori scope qui.
- `navigator.onLine` riflette lo stato del network adapter, non la raggiungibilità reale dei server (es. WiFi connesso ma DNS rotto): in quei casi le query falliscono e si vede l'`ErrorState` esistente, non il banner offline. Limite noto del browser.

### File modificati / creati

| File | Tipo | Modifica |
|---|---|---|
| `src/hooks/useOnlineStatus.ts` | NUOVO | Hook con `navigator.onLine` + listener + flag `justReconnected`. |
| `src/components/common/OfflineIndicator.tsx` | NUOVO | Banner sticky animato, mostra solo se offline. |
| `src/components/common/OfflineFallback.tsx` | NUOVO | Schermata fallback con `WifiOff`, pulsante Riprova condizionale. |
| `src/components/layout/Layout.tsx` | EDIT | Inserisce `<OfflineIndicator />` + toast "Connessione ripristinata". |
| `src/pages/Index.tsx` | EDIT | Mostra `OfflineFallback` quando errore + offline + nessun dato. |
| `src/pages/Formula1Page.tsx` | EDIT | Idem. |
| `src/pages/MotoGPPage.tsx` | EDIT | Idem. |
| `src/pages/JuventusPage.tsx` | EDIT | Idem. |
| `src/pages/SinnerPage.tsx` | EDIT | Idem. |
| `src/pages/StreamingPage.tsx` | EDIT | Idem. |
| `changelog.md` | EDIT | Voce sotto `### Added`: indicatore offline/online + fallback, niente SW. |

### Checklist post-edit

1. DevTools → Network → Offline: appare il banner rosso in cima, leggibile in light + dark.
2. Toggle online: banner scompare, toast verde "Connessione ripristinata".
3. Visita `/formula1` mai aperta + offline: vedo `OfflineFallback` con pulsante "Riprova" disabilitato.
4. Torno online: il pulsante "Riprova" si attiva.
5. Pagina già visitata + offline: vedo i dati cache con il banner sopra.
6. `prefers-reduced-motion: reduce`: animazione banner ridotta.
7. Nessun service worker registrato (DevTools → Application → Service Workers vuoto).
8. `npm run lint` + `npm run build`.
9. Aggiornare `changelog.md`.
10. Lavorare su `develop`, PR verso `develop`, assegnare `@matteobern9244`.

