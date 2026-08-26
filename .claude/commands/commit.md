---
description: Analizza le modifiche e crea un commit con messaggio in italiano, rispettando le regole di autore del repository.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

## Stato corrente

- Branch: !`git branch --show-current`
- Modifiche: !`git status --short`
- Diff: !`git diff --stat`
- Gia' in stage: !`git diff --staged --stat`
- Stile dei messaggi recenti: !`git log --oneline -10`

## Regole vincolanti

1. **Autore.** Usa soltanto l'identita' gia' configurata in `git config`. Mai
   `--author`, mai `GIT_AUTHOR_*`.
2. **Nessuna firma.** Niente trailer `Co-Authored-By`, niente «Generated with»,
   niente emoji. Claude non compare da nessuna parte nel messaggio.
3. **Mai su `main`.** Se il branch corrente e' `main`, fermati e dillo.
4. **Niente push.** Il commit si ferma in locale.

## Messaggio

In italiano. La prima riga dice **cosa cambia per chi usa il codice o l'app**,
non quali file hai toccato. Il corpo spiega il perche', e se la modifica corregge
un difetto dice anche perche' quel difetto non faceva rumore.

## Procedura

1. Leggi il diff per intero prima di scrivere il messaggio.
2. Se le modifiche non sono correlate fra loro, proponi di dividerle in piu'
   commit invece di impacchettarle insieme.
3. Metti in stage in modo selettivo: `git add -A` alla cieca include anche cose
   che non hai guardato.
4. Verifica che `changelog.md` sia aggiornato, se il cambiamento e' percepibile.
5. Dopo il commit, mostra `git log -1 --stat` come conferma.
