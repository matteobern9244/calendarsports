#!/usr/bin/env node
/**
 * sync-serie-a-teams.mjs
 *
 * Copia l'elenco delle squadre di Serie A da `src/lib/` allo specchio che le
 * edge function possono importare.
 *
 * Perché una copia e non un import: Supabase carica le edge function con il
 * solo contenuto di `supabase/functions/`. Un import che risalga dentro `src/`
 * supera il typecheck locale e si rompe al deploy, cioè lontano da dove è
 * stato introdotto.
 *
 * Il guardiano che rende obbligatorio rilanciare questo comando è
 * `src/test/tooling/serieATeamsMirror.test.ts`, dentro `bun run test`.
 *
 * Uso:
 *   bun run sync:teams            rigenera lo specchio
 *   bun run sync:teams --check    esce con 1 se lo specchio è divergente
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SORGENTE = "src/lib/serieATeams.ts";
const SPECCHIO = "supabase/functions/_shared/serieATeams.ts";

const INTESTAZIONE = `/**
 * NON MODIFICARE QUESTO FILE A MANO.
 *
 * È una copia generata di \`${SORGENTE}\`: qualunque modifica scritta qui
 * viene sovrascritta, e nel frattempo l'app e le edge function offrirebbero
 * due elenchi di squadre diversi.
 *
 * Modifica la sorgente, poi rigenera con \`bun run sync:teams\`.
 */

`;

const sorgente = readFileSync(join(ROOT, SORGENTE), "utf8");
const atteso = INTESTAZIONE + sorgente;

if (process.argv.includes("--check")) {
  let attuale = null;
  try {
    attuale = readFileSync(join(ROOT, SPECCHIO), "utf8");
  } catch {
    /* lo specchio non esiste: divergente per definizione */
  }
  if (attuale !== atteso) {
    console.error(`${SPECCHIO} è divergente da ${SORGENTE}. Lancia \`bun run sync:teams\`.`);
    process.exit(1);
  }
  console.log(`${SPECCHIO} è allineato.`);
  process.exit(0);
}

writeFileSync(join(ROOT, SPECCHIO), atteso);
console.log(`${SPECCHIO} rigenerato da ${SORGENTE}.`);
