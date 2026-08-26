#!/usr/bin/env bash
# PreToolUse su Bash: blocca i comandi che questo repository non puo' permettersi
# di eseguire per sbaglio. Esce con 2 per fermare la chiamata e far leggere il
# motivo al modello.
#
# Il JSON dell'evento arriva su stdin. Lo leggiamo con `node -e` invece che con
# `jq`, che non e' garantito su tutte le macchine.
set -uo pipefail

event="$(cat)"
command="$(printf '%s' "$event" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c)).on("end", () => {
  try { process.stdout.write(JSON.parse(raw)?.tool_input?.command ?? ""); }
  catch { process.stdout.write(""); }
});
' 2>/dev/null)"

[ -z "$command" ] && exit 0

deny() {
  echo "BLOCCATO da .claude/hooks/block-dangerous-bash.sh" >&2
  echo "$1" >&2
  exit 2
}

# 1. Push su main, in qualunque forma.
if printf '%s' "$command" | grep -Eq 'git[[:space:]]+push'; then
  if printf '%s' "$command" | grep -Eq '(origin[[:space:]]+main|[[:space:]]main([[:space:]]|$)|HEAD:main|--all|--mirror)'; then
    deny "main e' sincronizzato con Lovable ed e' la linea di produzione: non riceve push diretti. Si lavora su develop. Vedi AGENTS.md, sezione «Regole sempre valide»."
  fi
fi

# 2. Distruzione del database di produzione.
if printf '%s' "$command" | grep -Eq 'supabase[[:space:]]+db[[:space:]]+(reset|push)'; then
  deny "Il progetto Supabase collegato e' quello di produzione: reset e push dello schema vanno fatti a mano, con un piano di verifica."
fi

# 3. Riscrittura della storia.
if printf '%s' "$command" | grep -Eq 'git[[:space:]]+(reset[[:space:]]+--hard[[:space:]]+origin|filter-branch)|git[[:space:]]+push[[:space:]]+.*--force'; then
  deny "Riscrivere la storia rompe la sincronizzazione con Lovable, che committa su main per conto suo."
fi

# 4. rm -rf su percorsi assoluti, tranne le directory temporanee.
if printf '%s' "$command" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)[[:space:]]+/'; then
  if ! printf '%s' "$command" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]+[[:space:]]+(/tmp|/private/tmp)'; then
    deny "rm -rf su un percorso assoluto: se e' davvero quello che vuoi, eseguilo tu."
  fi
fi

exit 0
