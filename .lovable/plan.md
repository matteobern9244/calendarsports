
## Piano: estendere "Sincronizza" all'intera sezione Streaming

### Contesto verificato

`handleSync` in `src/pages/Index.tsx` chiama `queryClient.invalidateQueries()` senza filtri, che in teoria invalida tutte le query. Tuttavia React Query di default rifetcha solo le query **attive** (montate). La home monta solo le 5 query `["streaming-tv", family]` (via `useQueries`) e gli hook sport. Le query streaming non attive sulla home sono:

- `["streaming-releases", provider, dateFrom, dateTo]` (4 provider × range date)
- `["streaming-credits", type, id]` (dettaglio singolo, non rilevante per refresh massivo)

Quindi: cliccando Sincronizza, **i palinsesti TV vengono già aggiornati** (sono attivi sulla home), ma **le nuove uscite no**, perché la query è montata solo quando l'utente apre `/streaming` tab Releases.

### Obiettivo

Sincronizza deve forzare il refetch lato server di:
1. Tutti e 5 i palinsesti TV (già attivi → ok con invalidate, ma forziamo `refetchType: "all"` per coerenza)
2. Tutti e 4 i provider di nuove uscite (Netflix, Prime, Disney+, HBO Max) per il range default (oggi → +14 giorni, come fa `StreamingPage`)
3. Le query sport esistenti (comportamento attuale)

### Modifica

**`src/pages/Index.tsx`** — `handleSync`:

```ts
const handleSync = async () => {
  setSyncing(true);
  try {
    // 1. Invalida tutto (sport + tv già attivi)
    await queryClient.invalidateQueries({ refetchType: "all" });

    // 2. Pre-fetch esplicito delle 4 famiglie releases (non montate sulla home)
    const today = todayRomeISO();
    const dateTo = addDaysISO(today, 14);
    await Promise.all(
      STREAMING_PROVIDERS.map((p) =>
        queryClient.prefetchQuery({
          queryKey: ["streaming-releases", p.id, today, dateTo],
          queryFn: () => streamingApi.getReleasesByProvider(p.id, today, dateTo),
          staleTime: 0, // forza refetch anche se cache fresca
        })
      )
    );

    toast.success("Tutti i dati sono stati aggiornati!");
  } catch {
    toast.error("Errore durante la sincronizzazione");
  } finally {
    setSyncing(false);
  }
};
```

Aggiungo:
- import `STREAMING_PROVIDERS` da `@/hooks/useStreamingData`
- helper locali `todayRomeISO()` e `addDaysISO()` (replicati dal pattern già usato in `StreamingPage.tsx`, oppure estratti — per ora replicati per non toccare altri file)

### File toccati

- `src/pages/Index.tsx` (solo `handleSync` + import + 2 helper)

### Vincoli

- Nessuna nuova dipendenza
- Nessuna modifica a edge functions, env, branch policy
- UI invariata (solo comportamento del bottone)
- Italian-only mantenuto

### Verifica

1. Click Sincronizza sulla home → spinner attivo, toast success
2. Apri `/streaming` tab Nuove Uscite subito dopo → dati già caldi in cache (nessun loading visibile)
3. `npm run lint` + `npm run build`
