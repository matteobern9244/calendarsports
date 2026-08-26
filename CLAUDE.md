# CLAUDE.md

## Fonte di verità

Prima di qualunque modifica leggi [`AGENTS.md`](AGENTS.md): è il contratto comune
e contiene la tabella che indica il playbook obbligatorio per area. Questa guida
non duplica regole di architettura, dati o verifica: per il dettaglio usa
`docs/agent-playbook/` e i documenti tecnici lì richiamati.

## Promemoria per Claude Code

- Rispondi in italiano, salvo richiesta esplicita diversa.
- Non fare commit, push, merge o PR se non richiesto. Quando viene richiesto un
  commit, usa soltanto l'identità Git già configurata: nessun `--author`, nessun
  trailer `Co-Authored-By`, nessuna firma o dicitura generata dall'agente.
- Non lavorare mai direttamente su `main`: è il branch sincronizzato con Lovable.
- Avvia il server solo con `bun run dev --host 127.0.0.1`, e verifica che sia in
  ascolto prima di dire che è pronto.
- Il gate prima di consegnare è `bun run verify`, più `bun run test:e2e` per la
  navigazione.
- **TypeScript resta sulla 5.9.** `typescript-eslint` dichiara
  `typescript <6.1.0`: aggiornare alla 7 spegnerebbe il linting type-aware. È
  l'unica dipendenza che `bun outdated` mostra ferma, ed è ferma di proposito.
- I permessi e gli hook condivisi vivono in `.claude/settings.json`; le
  preferenze personali restano in `.claude/settings.local.json` e
  `CLAUDE.local.md`, esclusi dal repository.

## Risorse locali

- `.claude/commands/commit.md`: formato del comando `/commit`.
- `.claude/agents/`: profili per review, debugging e audit sicurezza.
- `.claude/rules/`: promemoria contestuali caricati per glob, che rimandano alle
  guide portabili. Se la loro sintesi diverge dal playbook, vale il playbook.
- `docs/ROADMAP.md`: backlog, cioè quello che non esiste ancora e perché.
