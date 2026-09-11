import type { CSSProperties } from "react";
import { readableOn, toCssHsl, type Hsl } from "@/lib/color";
import { TEAM_COLORS } from "@/lib/teamColors";
import { DEFAULT_TEAM, type SerieATeam } from "@/lib/serieATeams";

/**
 * Il tema visivo della sezione squadra: font e colore, in un posto solo.
 *
 * Viene applicato su `TeamRoute`, che avvolge sia la pagina squadra sia il
 * dettaglio partita: un interruttore, e ogni componente dentro lo eredita
 * **anche se scritto domani**, senza saperne niente.
 *
 * Il prezzo di questa scelta e' la non-localita': chi legge `font-heading` o
 * `--team-accent` dentro `NextMatchCard` non ha modo di sapere che cambiano con
 * la squadra. Per questo la regola sta scritta qui e in `index.css`, e non
 * soltanto nei componenti che la subiscono.
 */

/** I due fondi del tema, da `index.css`. Servono a misurare il contrasto. */
const FONDO_CHIARO: Hsl = { h: 220, s: 30, l: 96 };
const FONDO_SCURO: Hsl = { h: 220, s: 30, l: 6 };

/** WCAG AA per il testo normale. */
const CONTRASTO_TESTO = 4.5;

/**
 * Il colore del testo quando quello sociale non si legge.
 *
 * Non e' un ripiego silenzioso: `readableOn` restituisce `null` solo quando
 * **nessuna** luminosita' di quella tinta raggiunge il rapporto, e in quel caso
 * la squadra usa il colore di testo del tema. Meglio una riga che non e' della
 * squadra di una riga che non si legge.
 */
function testoLeggibile(accent: Hsl, fondo: Hsl, ripiego: string): string {
  const esito = readableOn(accent, fondo, CONTRASTO_TESTO);
  return esito ? toCssHsl(esito) : ripiego;
}

export function teamAccent(team: SerieATeam): Hsl {
  return TEAM_COLORS[team.slug] ?? TEAM_COLORS[DEFAULT_TEAM.slug];
}

/**
 * Le variabili CSS della squadra.
 *
 * `--team-accent` e le sue due varianti sono **accenti**: bordi, gradienti,
 * ombre, pastiglie, dove un contrasto basso e' un difetto estetico.
 * `--team-accent-text` e' l'unica pensata per il **testo**, ed e' l'unica che
 * passa dalla misura del contrasto, perche' li' un contrasto basso e' un
 * difetto di accessibilita'.
 *
 * Le due varianti di testo vengono emesse entrambe perche' uno stile inline non
 * sa in quale tema verra' letto: e' `index.css` a scegliere quale delle due
 * diventa `--team-accent-text`, sotto `html.dark` e fuori.
 */
export function teamThemeStyle(team: SerieATeam): CSSProperties {
  const accent = teamAccent(team);
  return {
    "--team-accent": toCssHsl(accent),
    "--team-accent-light": toCssHsl({ ...accent, l: Math.min(100, accent.l + 14) }),
    "--team-accent-dark": toCssHsl({ ...accent, l: Math.max(0, accent.l - 16) }),
    "--team-accent-on-light": testoLeggibile(accent, FONDO_CHIARO, "var(--foreground)"),
    "--team-accent-on-dark": testoLeggibile(accent, FONDO_SCURO, "var(--foreground)"),
  } as CSSProperties;
}

/**
 * Le classi della sezione squadra.
 *
 * `team-neutral` spegne il carattere condensato: `--font-heading` torna al font
 * del testo per tutto il sottoalbero. Resta alla **Juventus** soltanto, che e'
 * la scelta fatta dall'utente: fuori dalla sezione squadra non cambia niente,
 * dentro il carattere juventino resta juventino.
 */
export function teamThemeClass(team: SerieATeam): string {
  return team.slug === DEFAULT_TEAM.slug ? "team-theme" : "team-theme team-neutral";
}
