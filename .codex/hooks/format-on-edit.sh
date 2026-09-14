#!/usr/bin/env bash
# Hook PostToolUse: formatta con Prettier il file appena scritto o modificato.
#
# Esce sempre con 0. Un guasto del formattatore non deve interrompere il
# lavoro dell'agente: il gate vero e' `bun run lint`, che ha Prettier come
# errore. Questo hook serve solo a evitare che ogni modifica arrivi al lint
# gia' sporca di formattazione.

set -uo pipefail

payload=$(cat)

file_path=$(printf '%s' "$payload" |
  sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' |
  head -1)

[ -n "$file_path" ] || exit 0
[ -f "$file_path" ] || exit 0

# `--ignore-unknown` salta i file per cui Prettier non ha un parser, e
# `.prettierignore` esclude i generati (types.ts della CLI Supabase).
bunx prettier --write --ignore-unknown "$file_path" >/dev/null 2>&1

exit 0
