

## Verifica wrapper bianco loghi costruttori F1 — altre viste

### Risultato dell'esplorazione

Ho cercato in tutto il codice (`src/**/*.tsx`) tutte le occorrenze di rendering dei loghi costruttori Formula 1 (`logoUrl` da `useF1ConstructorStandings`, uso di `TeamLogo` con dati F1, mapping costruttori).

**Unica vista che mostra i loghi dei costruttori F1**: `src/pages/Formula1Page.tsx`, tab "Costruttori". In quella vista il wrapper bianco con bordino è già stato applicato nella modifica precedente:

```tsx
<div className="flex h-8 w-12 items-center justify-center rounded-md bg-white p-0.5 border border-border/40 flex-shrink-0">
  <TeamLogo src={c.logoUrl} name={c.constructor} ... className="h-7 w-11 bg-transparent border-0" />
</div>
```

**Altre viste verificate (nessun logo costruttore F1 mostrato)**:
- `src/pages/Index.tsx` (Home / Prossimi Eventi) — mostra solo testo `raceName` + `circuit`, nessun logo.
- Tab "Calendario" di `Formula1Page` — solo testo (circuito, località, orari sessioni).
- Tab "Piloti" di `Formula1Page` — colonna "Scuderia" è solo testo (`d.constructor`), nessun logo.
- `TonightTvList`, `EventCard`, `HighlightsSection` — non usano `logoUrl` dei costruttori F1.
- `JuventusPage`, `MotoGPPage`, `SinnerPage` — sport diversi, non interessati.

### Conclusione

**Nessuna modifica da applicare.** Il wrapper bianco con bordino è già presente nell'unico punto in cui i loghi dei costruttori F1 vengono renderizzati. La leggibilità in dark mode e light mode è già garantita dalla modifica precedente.

Se in futuro venisse aggiunta una nuova vista che mostra i loghi costruttori F1 (es. card riassuntiva in Home, widget classifica costruttori in altra pagina), sarà necessario riapplicare lo stesso pattern:

```tsx
<div className="flex h-8 w-12 items-center justify-center rounded-md bg-white p-0.5 border border-border/40 flex-shrink-0">
  <TeamLogo src={...} name={...} className="h-7 w-11 bg-transparent border-0" />
</div>
```

Nessun comando da eseguire, nessun file da modificare. Confermi che vuoi comunque procedere ad aggiungere preventivamente lo stesso wrapper in qualche vista specifica (es. una nuova card in Home), oppure chiudiamo il task come "non necessario"?

