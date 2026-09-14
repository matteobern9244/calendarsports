# Aggiorna documentazione

Usa `AGENTS.md` come fonte primaria e aggiorna documentazione senza
introdurre affermazioni non verificate.

Leggi almeno:

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
- [changelog.md](../../changelog.md)
- [.env.example](../../.env.example)
- [package.json](../../package.json)

Quando proponi testo:

- distingui tra fonti live, scraping, fallback e contenuti hardcoded;
- mantieni allineate policy Git, rischio `main` e relazione con
  Lovable;
- tratta come configurazione finale il flusso feature branch -> `develop` ->
  `main` e una sola Ruleset moderna su `main`;
- non suggerire push automatici su `main`;
- non dichiarare come verificato cio' che non e' stato controllato con
  file, diff o comandi.

Formato richiesto:

## Fatti verificati

## Ipotesi

## Raccomandazioni
