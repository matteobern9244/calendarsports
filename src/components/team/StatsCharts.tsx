import { cn } from "@/lib/utils";
import type { Esito, PuntoAndamento } from "@/lib/teamStats";
import { COLORE_ESITO, NOME_ESITO, formattaMedia, formattaNumero } from "./statsPresentation";

/**
 * I tre grafici della scheda «Statistiche», disegnati a mano con SVG e CSS.
 *
 * ## Perche' non una libreria di grafici
 *
 * Il piano prevedeva `recharts`. Non e' stata aggiunta, per tre ragioni che
 * valgono insieme:
 *
 * 1. `AGENTS.md` chiede di non aggiungere dipendenze quando lo stack presente
 *    basta, e per una barra impilata, tre barre di confronto e una spezzata
 *    basta. Sono un `div` con `flex` e una `polyline`.
 * 2. Il colore. Dalla Fase 5 l'identita' della squadra e' una variabile CSS
 *    ereditata da `TeamRoute`: un `stroke-[hsl(var(--team-accent))]` la prende
 *    da solo, e cambia con la squadra senza che questo file sappia che
 *    esistono venti squadre. A una libreria il colore si passa come proprieta'
 *    JavaScript, quindi andrebbe letto con `getComputedStyle` — cioe' un
 *    effetto, un ri-render e una fonte di verita' in piu'.
 * 3. Il peso. L'app e' installabile, e `recharts` porta con se' mezza `d3`.
 *
 * Il prezzo e' che questi grafici non hanno assi interattivi ne' tooltip al
 * passaggio del dito. E' un prezzo accettabile per tre grafici di riepilogo;
 * non lo sarebbe per una sezione di analisi.
 *
 * ## Accessibilita'
 *
 * Ogni grafico e' `role="img"` con la sua descrizione, e ognuno ha accanto gli
 * stessi numeri scritti. Un grafico che esiste solo come disegno e' un dato
 * che per qualcuno non c'e'.
 */

/**
 * Vittorie, pareggi e sconfitte come una barra sola.
 *
 * I colori qui **non** sono quelli della squadra: verde, grigio e rosso sono
 * la convenzione che si legge senza istruzioni, e il rendimento di un Milan
 * disegnato tutto in rosso sarebbe illeggibile proprio per la squadra che
 * quel rosso ce l'ha. L'identita' della squadra sta nell'andamento punti,
 * dove il colore significa «questa squadra» e non «questo esito».
 */
export function BarraRendimento({
  vinte,
  nulle,
  perse,
}: {
  vinte: number;
  nulle: number;
  perse: number;
}) {
  const totale = vinte + nulle + perse;
  const voci: { esito: Esito; valore: number }[] = [
    { esito: "V", valore: vinte },
    { esito: "N", valore: nulle },
    { esito: "S", valore: perse },
  ];
  if (totale === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna partita di campionato giocata.</p>;
  }

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Rendimento su ${totale} partite: ${vinte} vittorie, ${nulle} pareggi, ${perse} sconfitte.`}
      >
        {voci.map(({ esito, valore }) =>
          valore > 0 ? (
            <div
              key={esito}
              className={cn("h-full", COLORE_ESITO[esito])}
              style={{ width: `${(valore / totale) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {voci.map(({ esito, valore }) => (
          <li key={esito} className="flex items-center gap-2">
            <span
              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", COLORE_ESITO[esito])}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{NOME_ESITO[esito]}</span>
            <span className="font-heading font-bold tabular-nums">{valore}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RigaConfronto {
  label: string;
  valore: number | null;
  media: number | null;
  /**
   * Se stare sopra la media sia un merito.
   *
   * Non e' un dettaglio di stile: per i **gol subiti** stare sopra la media e'
   * il contrario di una buona notizia, e senza questo campo la riga dice
   * «sopra la media» in verde a una difesa che prende piu' gol di tutti. Il
   * numero sarebbe giusto e la lettura sbagliata, che e' il modo peggiore di
   * avere ragione.
   */
  piuEMeglio: boolean;
}

/**
 * Il valore della squadra contro la media del campionato.
 *
 * La media e' una **tacca**, non una seconda barra: la domanda a cui questo
 * grafico risponde e' «sopra o sotto», e due barre affiancate costringono a
 * confrontare due lunghezze invece di guardare da che parte cade il segno.
 *
 * La scala e' comune alla riga, non al gruppo: punti a partita e gol a partita
 * non sono la stessa grandezza, e un asse condiviso schiaccerebbe i gol.
 */
export function ConfrontoMedia({ righe }: { righe: RigaConfronto[] }) {
  return (
    <ul className="space-y-4">
      {righe.map(({ label, valore, media, piuEMeglio }) => {
        const massimo = Math.max(valore ?? 0, media ?? 0) * 1.2 || 1;
        const sopra = valore !== null && media !== null && valore > media;
        const bene = sopra === piuEMeglio;
        return (
          <li key={label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-heading font-bold tabular-nums text-[hsl(var(--team-accent-text))]">
                {formattaMedia(valore)}
              </span>
            </div>
            <div
              className="relative mt-1.5 h-2.5 w-full rounded-full bg-muted"
              role="img"
              aria-label={`${label}: ${formattaMedia(valore)}, media del campionato ${formattaMedia(media)}.`}
            >
              <div
                className="h-full rounded-full bg-[hsl(var(--team-accent))]"
                style={{ width: `${Math.min(100, ((valore ?? 0) / massimo) * 100)}%` }}
              />
              {media !== null && (
                <span
                  className="absolute top-[-3px] h-[17px] w-0.5 rounded-full bg-foreground/70"
                  style={{ left: `${Math.min(100, (media / massimo) * 100)}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Media del campionato {formattaMedia(media)}
              {valore !== null && media !== null && (
                <span
                  className={cn(
                    "ml-1.5 font-medium",
                    // Due colori, uno per verdetto: la cattiva notizia in grigio
                    // spariva nel testo intorno e la riga sembrava «senza
                    // giudizio», mentre quella accanto era verde.
                    bene ? "text-success" : "text-destructive",
                  )}
                >
                  ({sopra ? "sopra" : "sotto"} la media)
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Il riquadro del disegno. Non sono pixel sullo schermo: l'SVG scala con la
 * larghezza disponibile mantenendo questo rapporto, ed e' il motivo per cui il
 * grafico ha un `max-w-3xl`. Senza, su un desktop largo il riquadro arriva a
 * 1200 px e con il rapporto 640:200 diventa alto 375: un grafico di riepilogo
 * che si prende un terzo di schermo.
 */
const LARGHEZZA = 640;
const ALTEZZA = 200;
const BORDO = { sinistra: 30, destra: 10, alto: 14, basso: 24 };
const INTERNA_L = LARGHEZZA - BORDO.sinistra - BORDO.destra;
const INTERNA_A = ALTEZZA - BORDO.alto - BORDO.basso;

/**
 * I punti accumulati partita dopo partita, con la media del campionato come
 * riferimento.
 *
 * La riga tratteggiata e' «una squadra qualunque di questo campionato»: senza,
 * una curva che sale non dice niente, perche' salgono tutte. Con, la distanza
 * fra le due linee e' la stagione.
 *
 * L'asse orizzontale sono le **partite giocate**, non le giornate: con i
 * recuperi le due cose divergono e un buco nella curva somiglierebbe a un
 * crollo. Vedi `andamentoPunti` in `teamStats.ts`.
 */
export function AndamentoPunti({
  punti,
  mediaPerPartita,
}: {
  punti: PuntoAndamento[];
  mediaPerPartita: number | null;
}) {
  if (punti.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna partita di campionato giocata.</p>;
  }

  const ultimo = punti[punti.length - 1];
  const finaleMedia = mediaPerPartita === null ? 0 : mediaPerPartita * punti.length;
  // Il tetto tiene conto di entrambe le linee: se la media superasse la
  // squadra, una scala tarata sulla sola squadra taglierebbe il riferimento.
  const massimo = Math.max(ultimo.cumulati, finaleMedia, 1);

  // Con una partita sola non c'e' un intervallo da dividere: il punto va al
  // centro, altrimenti `i / (n - 1)` divide per zero.
  const x = (i: number) =>
    BORDO.sinistra + (punti.length === 1 ? INTERNA_L / 2 : (i / (punti.length - 1)) * INTERNA_L);
  const y = (valore: number) => BORDO.alto + INTERNA_A - (valore / massimo) * INTERNA_A;

  const linea = punti.map((p, i) => `${x(i)},${y(p.cumulati)}`).join(" ");
  const area = `${x(0)},${y(0)} ${linea} ${x(punti.length - 1)},${y(0)}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
        className="mx-auto h-auto w-full max-w-3xl overflow-visible"
        role="img"
        aria-label={`Andamento punti: ${ultimo.cumulati} punti dopo ${punti.length} partite di campionato${
          mediaPerPartita === null
            ? ""
            : `, contro i ${formattaNumero(finaleMedia)} della media del campionato`
        }.`}
      >
        {[0, 0.5, 1].map((frazione) => (
          <g key={frazione}>
            <line
              x1={BORDO.sinistra}
              x2={LARGHEZZA - BORDO.destra}
              y1={y(massimo * frazione)}
              y2={y(massimo * frazione)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={BORDO.sinistra - 6}
              y={y(massimo * frazione) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {Math.round(massimo * frazione)}
            </text>
          </g>
        ))}

        <polygon points={area} className="fill-[hsl(var(--team-accent))]/15" />

        {mediaPerPartita !== null && (
          <line
            x1={x(0)}
            y1={y(mediaPerPartita)}
            x2={x(punti.length - 1)}
            y2={y(finaleMedia)}
            className="stroke-muted-foreground"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        )}

        <polyline
          points={linea}
          fill="none"
          className="stroke-[hsl(var(--team-accent))]"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={x(punti.length - 1)}
          cy={y(ultimo.cumulati)}
          r={5}
          className="fill-[hsl(var(--team-accent))] stroke-background"
          strokeWidth={2}
        />

        <text
          x={BORDO.sinistra}
          y={ALTEZZA - 6}
          className="fill-muted-foreground text-[11px]"
          textAnchor="start"
        >
          1ª
        </text>
        <text
          x={LARGHEZZA - BORDO.destra}
          y={ALTEZZA - 6}
          className="fill-muted-foreground text-[11px]"
          textAnchor="end"
        >
          {punti.length}ª giocata
        </text>
      </svg>

      <p className="mt-2 text-sm text-muted-foreground">
        <span className="font-heading font-bold text-[hsl(var(--team-accent-text))]">
          {ultimo.cumulati} punti
        </span>{" "}
        dopo {punti.length} {punti.length === 1 ? "partita" : "partite"} di campionato
        {mediaPerPartita !== null && <> · media del campionato {formattaNumero(finaleMedia)}</>}
      </p>
    </div>
  );
}
