# AGENTS

## Scopo e fonte di verità

Questo file è il contratto comune per ogni agente che lavora su questo
repository, non solo per Claude Code, e si legge nell'ordine in cui è scritto:
**scopo → regole sempre valide → quale guida leggere → metodo → file intoccabili
→ verifica e consegna**.

L'obiettivo non è descrivere il prodotto: è ridurre il rischio di regressioni,
di dati falsi presentati come veri e di modifiche che rompono la
sincronizzazione con Lovable. Privilegia cambiamenti piccoli, verificabili e
sicuri in produzione.

**Il dettaglio operativo vive nelle guide** in `docs/agent-playbook/`: la tabella
«Come scegliere la guida» dice quali sono obbligatorie per l'area toccata, e
quelle guide sono vincolanti quanto questo file.

Se codice, schema o configurazione divergono dalla prosa, **vale il contratto
reale**: verificalo e correggi la documentazione nello stesso cambiamento.

## Regole sempre valide

**Lingua e formato.** L'interfaccia è in italiano, con le sole eccezioni
`STREAMING` e `CALENDAR EVENTS`. Date e orari sono sempre in `Europe/Rome`. I
nomi propri e gli acronimi tecnici restano nella loro forma.

**Branch e workflow.** `main` è sincronizzato con Lovable e non riceve push
diretti: si lavora su `develop` o su un branch che nasce da `develop`. Il deploy
in produzione è manuale dentro Lovable. **Non fare commit, push, merge o PR se
non ti è stato chiesto.**

**Configurazione e segreti.** Nessuna modifica a workflow, deploy, segreti,
progetto Supabase, RLS, cron o service worker senza richiesta esplicita e senza
un piano di verifica. `.env` è tracciato di proposito e contiene solo valori
pubblici; i segreti veri stanno nei secrets di Supabase, quelli personali in
`.env.local`.

**Onestà sulle fonti.** Questa app non possiede i dati che mostra: li prende da
API, da scraping HTML e da dataset statici scritti nel codice. **Non presentare
mai come fonte ufficiale ciò che è statico o scrapato**, e dichiara sempre quando
una sezione dipende da scraping.

**Onestà del resoconto.** Distingui sempre azione tentata, azione riuscita e
risultato verificato; separa fatti, ipotesi e raccomandazioni. Non dichiarare
"fatto" o "risolto" senza una verifica reale.

## Come scegliere la guida

Leggi la guida indicata **prima** di modificare l'area. Più righe possono
applicarsi allo stesso intervento.

| Area o tipo di modifica                                               | Guida obbligatoria                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Git, Lovable, CI, dipendenze, release, ambiente                       | `docs/agent-playbook/repository-operations.md`              |
| Route, pagine, componenti, hook, client Supabase, struttura di `src/` | `docs/agent-playbook/architecture-and-boundaries.md`        |
| Edge function, fonti dati, orari, stagioni, lingua della UI           | `docs/agent-playbook/data-sources-and-time.md`              |
| Test, guardiani, file generati, changelog, checklist di consegna      | `docs/agent-playbook/verification-and-change-management.md` |
| Per trovare pagina, hook, helper e test pertinenti al dominio         | `docs/agent-playbook/area-entrypoints.md`                   |

Documentazione tecnica di approfondimento: [`README.md`](README.md),
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md),
[`docs/SECURITY.md`](docs/SECURITY.md),
[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

## Metodo di lavoro

1. **Identifica dominio e rischio.** Una modifica alla formattazione di una data
   e una modifica a una edge function non hanno lo stesso raggio.
2. **Verifica il contratto reale** prima di scrivere: la forma del payload, i
   parametri della route, la chiave di cache dell'hook. Non fidarti della prosa,
   nemmeno di questa.
3. **TDD per ogni modifica non puramente documentale.** Il test che descrive il
   difetto si scrive prima e si guarda fallire. Non rimuovere né indebolire test
   esistenti per ottenere il verde.
4. **TypeScript rigoroso.** `strict` è attivo. Niente `any` senza una ragione
   scritta accanto. Nessuna dipendenza nuova se lo stack presente basta.
5. **Verifica su mobile e su desktop.** L'app è mobile-first ed è installabile:
   diverse viste hanno due alberi di render distinti.
6. **Zero avvisi.** Se il lavoro produce avvisi di qualunque strumento,
   sistemarli fa parte del lavoro: non è un follow-up e non è debito.

## File generati e delicati

- `src/integrations/supabase/types.ts` — generato dalla CLI Supabase.
- `src/components/ui/**` — generati dalla CLI shadcn; si rigenerano, non si
  editano.
- `.lovable/` — stato dell'editor Lovable, sincronizzato con `main`.
- `bun.lock` — si rigenera con `bun install`.
- `supabase/migrations/*` — le migration applicate non si riscrivono: se ne
  aggiunge una correttiva.
- `supabase/functions/_shared/security.ts` — CORS e rate limit di tutte le
  funzioni pubbliche.
- `supabase/functions/push-dispatcher/*` — gira con la service role key ed è
  protetto da un segreto condiviso.
- `.github/workflows/guard-main-source.yml` e `enable-pr-automerge.yml` —
  proteggono la policy su `main`.
- L'allowlist di `scripts/check-italian-ui.mjs` — allargarla va motivato nel
  changelog.

## Verifica e consegna

Il gate locale è **`bun run verify`**: typecheck, lint a zero avvisi, guardiano
lingua, guardiano fuso, test unitari, build. Le end-to-end si lanciano a parte
con `bun run test:e2e`. Non cambiare la composizione di `verify` senza allineare
i workflow in `.github/workflows/`.

Prima di consegnare, ispeziona `git status --short`. Aggiorna
[`changelog.md`](changelog.md) per ogni cambiamento percepibile, e la nota in
`docs/releases/` quando cambia la versione.

Il riepilogo finale deve indicare i file modificati, le verifiche eseguite e il
loro esito, **i limiti della verifica**, i rischi residui e gli eventuali
follow-up.
