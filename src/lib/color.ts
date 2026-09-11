/**
 * Contrasto e leggibilita' dei colori, per il tema per squadra.
 *
 * ## Perche' esiste
 *
 * Un colore sociale scelto per una maglia non e' scelto per stare sopra il
 * fondo di questa applicazione. Il nero della Juventus e dell'Udinese sparisce
 * sul tema scuro; il bianco del Napoli in trasferta sparisce su quello chiaro.
 * Senza una misura, «mettiamo i colori delle squadre» produce pagine dove una
 * scritta su venti non si legge, e nessuno se ne accorge finche' non capita a
 * lui.
 *
 * Qui dentro c'e' la misura: il rapporto di contrasto di WCAG 2.1, e una
 * funzione che schiarisce o scurisce un colore finche' quel rapporto non e'
 * raggiunto. Il test poi lo verifica su tutte e venti, in chiaro e in scuro.
 *
 * ## Il formato
 *
 * Tutto in **HSL a tre numeri** (`43 96% 56%`), che e' come il progetto scrive
 * i colori in `index.css`: `hsl(var(--token))` si aspetta esattamente quello.
 */

export interface Hsl {
  /** Gradi, 0-360. */
  h: number;
  /** Percentuale, 0-100. */
  s: number;
  /** Percentuale, 0-100. */
  l: number;
}

/** `43 96% 56%`, la forma che `hsl(var(--x))` sa leggere. */
export function toCssHsl({ h, s, l }: Hsl): string {
  return `${round(h)} ${round(s)}% ${round(l)}%`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** HSL -> RGB, ciascun canale 0-1. Formula di conversione standard. */
export function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const sat = clamp(s, 0, 100) / 100;
  const lum = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = lum - c / 2;
  return [r + m, g + m, b + m];
}

/**
 * Luminanza relativa secondo WCAG 2.1.
 *
 * La correzione di gamma non e' un dettaglio: senza, un giallo e un blu con la
 * stessa `l` in HSL risulterebbero ugualmente luminosi, e non lo sono affatto.
 */
export function relativeLuminance(color: Hsl): number {
  const [r, g, b] = hslToRgb(color).map((canale) =>
    canale <= 0.04045 ? canale / 12.92 : ((canale + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG, da 1 (identici) a 21 (nero su bianco). */
export function contrastRatio(a: Hsl, b: Hsl): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [chiaro, scuro] = la > lb ? [la, lb] : [lb, la];
  return (chiaro + 0.05) / (scuro + 0.05);
}

/**
 * Schiarisce o scurisce un colore finche' non si legge sul fondo dato.
 *
 * Muove **solo la luminosita'**: tinta e saturazione restano quelle della
 * squadra, che e' cio' che la rende riconoscibile. La direzione la decide il
 * fondo — su fondo scuro si sale, su fondo chiaro si scende — e si procede a
 * passi di un punto, tenendo il primo valore che basta: il piu' vicino
 * all'originale fra quelli leggibili.
 *
 * Se **nessuna** luminosita' raggiunge il rapporto — succede con tinte molto
 * sature su certi fondi — restituisce `null` invece del meglio disponibile.
 * Un colore «quasi leggibile» e' il modo silenzioso di avere un testo che
 * qualcuno non riesce a leggere: chi chiama deve poter ripiegare sul token
 * neutro del tema e saperlo.
 */
export function readableOn(color: Hsl, background: Hsl, minRatio: number): Hsl | null {
  if (contrastRatio(color, background) >= minRatio) return color;

  const versoIlChiaro = relativeLuminance(background) < 0.5;
  for (let passo = 1; passo <= 100; passo++) {
    const l = versoIlChiaro ? color.l + passo : color.l - passo;
    if (l < 0 || l > 100) break;
    const candidato = { ...color, l };
    if (contrastRatio(candidato, background) >= minRatio) return candidato;
  }
  return null;
}
