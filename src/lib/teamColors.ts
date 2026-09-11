import type { Hsl } from "@/lib/color";

/**
 * Il colore sociale di ciascuna squadra.
 *
 * ## Che dato e' questo
 *
 * **Statico e scritto a mano**, non ufficiale. Nessuna delle fonti che l'app
 * interroga — ne' Sky ne' la Lega — pubblica i colori sociali: questi vengono
 * dalle divise, scelti per essere riconoscibili sullo schermo, non per
 * corrispondere a un pantone. Vanno dichiarati per quello che sono, come chiede
 * `AGENTS.md` per ogni dato statico.
 *
 * ## Uno, non due
 *
 * Il piano ne prevedeva due per squadra. Ne basta **uno**: le varianti chiara e
 * scura si ricavano muovendo la luminosita', esattamente come `--gold-light` e
 * `--gold-dark` fanno oggi con l'oro. Quaranta valori scritti a mano invece di
 * venti sarebbero stati quaranta occasioni di sbagliare, per un risultato che
 * un calcolo produce identico.
 *
 * ## Le squadre senza un colore
 *
 * Juventus e Udinese giocano in bianconero, che non e' un accento: sul tema
 * scuro sparisce, su quello chiaro pure. La Juventus tiene l'oro che l'app usa
 * gia' — e' la sua livrea storica qui dentro, e la scelta dell'utente e' stata
 * di lasciargliela. L'Udinese prende un grigio-blu scuro, che non e' identita'
 * ma nemmeno una bugia: e' il caso limite che questo dataset non sa risolvere,
 * ed e' meglio dirlo qui che fingere un colore che la squadra non ha.
 *
 * Il guardiano in `teamColors.test.ts` verifica che le chiavi siano
 * **esattamente** i venti slug del dataset: una squadra aggiunta domani rende
 * rosso il test invece di ripiegare in silenzio su un grigio.
 */
export const TEAM_COLORS: Record<string, Hsl> = {
  atalanta: { h: 212, s: 100, l: 38 },
  bologna: { h: 2, s: 65, l: 45 },
  cagliari: { h: 352, s: 70, l: 42 },
  como: { h: 205, s: 85, l: 45 },
  fiorentina: { h: 282, s: 45, l: 45 },
  frosinone: { h: 48, s: 95, l: 50 },
  genoa: { h: 355, s: 72, l: 42 },
  inter: { h: 220, s: 90, l: 40 },
  // L'oro che l'app usa da sempre: `--gold` vale `43 96% 56%`.
  juventus: { h: 43, s: 96, l: 56 },
  lazio: { h: 196, s: 80, l: 48 },
  lecce: { h: 45, s: 95, l: 50 },
  milan: { h: 2, s: 78, l: 45 },
  monza: { h: 0, s: 72, l: 45 },
  napoli: { h: 205, s: 95, l: 42 },
  parma: { h: 48, s: 92, l: 50 },
  roma: { h: 348, s: 55, l: 35 },
  sassuolo: { h: 142, s: 60, l: 33 },
  torino: { h: 348, s: 50, l: 33 },
  // Bianconera come la Juventus, ma senza un oro che le appartenga.
  udinese: { h: 220, s: 12, l: 30 },
  venezia: { h: 24, s: 90, l: 48 },
};
