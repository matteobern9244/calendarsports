# Verifica, guardiani e gestione del cambiamento

## Scopo

Questa guida vale per **ogni modifica non puramente documentale**: test,
guardiani, file generati, changelog e consegna. Si applicano sempre anche le
regole root in [`AGENTS.md`](../../AGENTS.md).

## Regole

### Il test si scrive prima, e deve fallire

Per una correzione, il test che descrive il difetto va scritto per primo e va
visto fallire. È l'unico modo per sapere che sta misurando quello che credi:
un test scritto dopo la correzione passa anche quando è scritto male.

I tre test aggiunti a `src/lib/timezoneConsistency.test.ts` sulla lettura del
fuso nei confronti sono nati così, e due di loro fallivano.

**Non indebolire un test esistente per ottenere il verde.** Se un test dà
fastidio, o descrive un requisito che è cambiato — e allora si aggiorna
spiegando perché — oppure ha ragione lui.

### Zero avvisi è una regola, non uno stato

`bun run lint` gira con `--max-warnings=0` e `tsc` con `strict`. Se il tuo lavoro
produce avvisi di qualunque strumento, sistemarli fa parte del lavoro: non è un
follow-up e non è debito da dichiarare.

Le esenzioni puntuali esistono (`eslint-disable-next-line`, `// @tz-ignore`,
`// @lingua-ignore`) e sono ammesse **con la motivazione scritta accanto**. Una
esenzione senza spiegazione è indistinguibile da una svista.

### File generati e delicati

Non si modificano a mano:

- `src/integrations/supabase/types.ts` — generato dalla CLI Supabase.
- `src/components/ui/**` — generati dalla CLI shadcn.
- `.lovable/` — stato gestito dall'editor Lovable e sincronizzato con `main`.
- `bun.lock` — si rigenera con `bun install`, non si edita.

Le migration già applicate non si riscrivono: se ne aggiunge una correttiva. E
una migration deve poter essere rieseguita su un database vuoto senza esplodere:
`cron.unschedule` di un job inesistente solleva, e va guardato da un `EXISTS`.

### Il changelog non è opzionale

Ogni cambiamento percepibile entra in [`changelog.md`](../../changelog.md), e
ogni versione ha la sua nota in `docs/releases/`. Il changelog racconta **cosa
cambia per chi usa il codice o l'app**, non l'elenco dei file toccati.

## Contratti: i guardiani

Alcune proprietà di questo progetto non si verificano eseguendo il codice ma
**leggendolo**: quale espressione interpreta una data, in che lingua è una
stringa, da dove si importa un client. Vivono in punti che un test di
comportamento non raggiunge, o raggiungerebbe troppo tardi.

| Guardiano                                                            | Vieta                                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-rome-tz.mjs` (`bun run check:tz-juventus`)            | `toLocale*String` senza `timeZone: "Europe/Rome"`, e `new Date(stringa)` per confrontare eventi: legge l'ISO come ora locale e sfasa il conto alla rovescia |
| `scripts/check-italian-ui.mjs` (`bun run check:italian`)             | testo inglese in contenuti, `aria-label`, `placeholder`, toast e titoli. Non è un parser AST: copre il caso comune, non tutti                              |
| `no-restricted-imports` in `eslint.config.js`                        | l'import di `@/integrations/supabase/client`: senza env var iniettate produce richieste che rispondono HTML 200 e lasciano React Query in caricamento eterno |
| `react-hooks/set-state-in-effect`                                    | il `setState` sincrono dentro un effect: gira anche al mount, e così azzerava la pagina arrivata da `?page=`                                                |
| `react-hooks/purity`                                                 | `Math.random()` e `Date.now()` durante il render: valori che React non può ricalcolare                                                                     |
| `tsc --strict` (`bun run typecheck`)                                 | i tipi sbagliati. Ha trovato quattro `variant="outline-solid"` prodotti da un codemod che aveva scambiato una prop per una classe CSS                       |

### Regole d'uso dei guardiani

1. **Ogni esenzione porta la sua motivazione accanto.** `// @tz-ignore` e
   `// @lingua-ignore` senza una riga che spieghi perché sono una porta lasciata
   aperta.
2. **Aggiungere un'esenzione per far passare il gate equivale a spegnere il
   guardiano.** Se la forma vietata serve davvero, la ragione va scritta e deve
   reggere alla lettura di qualcun altro.
3. **Un guardiano che scansiona un elenco fisso di file invecchia male.**
   `check-rome-tz.mjs` nomina sette pagine: una pagina nuova nasce scoperta
   finché qualcuno non la aggiunge. È un limite noto, non un disegno.
4. **Quando una decisione tecnica vale ovunque, il commento che la spiega non
   basta.** La policy sul fuso era documentata, commentata e testata sugli helper
   di formattazione — ed era disattesa in ogni punto che confrontava due date.
   Serviva un guardiano.

## Verifiche

### Prima di modificare

- Identifica l'area e leggi la guida che la copre (tabella in `AGENTS.md`).
- Verifica il **contratto reale**, non la prosa: la forma del payload la dice
  l'edge function, non il documento.
- Distingui quello che hai verificato da quello che stai supponendo.

### Dopo aver modificato

```bash
bun run verify      # typecheck, lint, guardiani, test, build
bun run test:e2e    # navigazione reale
git status --short  # niente di inatteso in stage
```

Il riepilogo finale deve dire: quali file hai toccato, quali verifiche hai
eseguito **e con quale esito**, che cosa **non** hai verificato, e quali rischi
restano aperti. Distinguere "ho provato", "è riuscito" e "l'ho verificato" non è
una formalità: è l'unica cosa che rende utile il resoconto.

## Riferimenti

- Regole su fonti dati e tempo: [`data-sources-and-time.md`](data-sources-and-time.md).
- Operatività Git e CI: [`repository-operations.md`](repository-operations.md).
- Convenzioni di codice: [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md).
