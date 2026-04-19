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
- esplicitare eventuali rischi verso `main` o verso il workflow GitHub <-> Lovable;
- non proporre cambi di stack, branch policy o deploy senza richiesta esplicita.

Formato richiesto:

## Fatti verificati

## Ipotesi

## Raccomandazioni
