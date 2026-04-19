# Pianifica modifica

Usa `AGENTS.md` come fonte normativa primaria e costruisci un piano
conservativo prima di proporre modifiche.

Leggi almeno:

- [AGENTS.md](../../AGENTS.md)
- [src/App.tsx](../../src/App.tsx)
- [src/pages](../../src/pages)
- [src/hooks/useSportsData.ts](../../src/hooks/useSportsData.ts)
- [src/lib/api/sportsApi.ts](../../src/lib/api/sportsApi.ts)
- [supabase/functions](../../supabase/functions)

Genera un piano di modifica per la richiesta corrente.

Il piano deve:

- indicare la fonte dati reale coinvolta: API, scraping, fallback o hardcoded;
- valutare l'impatto su Home aggregata, hook React Query e Edge Function correlate;
- dichiarare criteri di accettazione e rischio principale della modifica;
- esplicitare la strategia `RED -> GREEN -> REFACTOR` se il task cambia il comportamento;
- includere i comandi di validazione che si intende eseguire;
- dichiarare eventuali controlli che potrebbero non essere eseguibili e il rischio residuo;
- esplicitare eventuali rischi verso `main` o verso il workflow GitHub <-> Lovable;
- assumere per le modifiche umane il flusso feature branch -> `develop` ->
  `main`;
- non proporre cambi di stack, branch policy o deploy senza richiesta esplicita.

Formato richiesto:

## Fatti verificati

## Ipotesi

## Raccomandazioni
