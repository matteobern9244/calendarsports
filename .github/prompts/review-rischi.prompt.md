# Review rischi

Usa `AGENTS.md` come fonte primaria e fai una review orientata ai
rischi reali del repository.

Leggi il diff o i file target insieme a:

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
- [src/hooks/useSportsData.ts](../../src/hooks/useSportsData.ts)
- [src/lib/api/sportsApi.ts](../../src/lib/api/sportsApi.ts)

Concentrati su:

- regressioni funzionali;
- mismatch di shape dati tra frontend e funzioni edge;
- fragilita' di scraping, parsing HTML, mapping statici e fallback stagionali;
- testo o codice che incentiva uso improprio di `main` o nasconde il rischio Lovable;
- testo che reintroduce Branch protection classica su `main` o salta il
  passaggio feature branch -> `develop` -> `main`;
- affermazioni documentali non supportate dal codice.

Formato richiesto:

## Fatti verificati

## Ipotesi

## Raccomandazioni
