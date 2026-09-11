import { useEffect } from "react";
import { useUserPrefs } from "@/contexts/useUserPrefs";
import { teamThemeStyle } from "@/lib/teamTheme";

/**
 * Il colore della squadra **preferita**, applicato a tutta l'applicazione.
 *
 * ## Perche' esiste, visto che c'e' gia' `TeamRoute`
 *
 * Le due regole del progetto sono in ordine: dentro una pagina squadra comanda
 * l'**indirizzo**, e dove l'indirizzo non nomina nessuna squadra — Home,
 * calendario, streaming — comanda la **preferenza**. `TeamRoute` copre la
 * prima. Questa copre la seconda, ed e' il motivo per cui il pallino del calcio
 * nel calendario aggregato puo' essere azzurro se la squadra scelta e' il
 * Napoli.
 *
 * L'ordine fra le due si mantiene da solo: qui le variabili finiscono su
 * `<html>`, `TeamRoute` le riscrive sul proprio sottoalbero, e la piu' vicina
 * vince. Nessuna delle due deve sapere dell'altra.
 *
 * ## Perche' su `<html>` e non su un contenitore React
 *
 * Per i **portali**. `DayEventsDialog` e il dettaglio evento del calendario
 * sono dialoghi Radix, che si montano sotto `document.body`: qualunque
 * contenitore React dentro la pagina li lascerebbe fuori, e il calendario
 * sarebbe azzurro con i suoi dialoghi rimasti oro. Un'incoerenza che non
 * produce nessun errore e si nota solo aprendo un giorno.
 *
 * La pulizia in uscita non e' formale: senza, un'uscita dall'account o un
 * cambio di preferenza che smontasse il componente lascerebbe su `<html>` i
 * colori dell'ultima squadra, che nessuno rimuoverebbe piu'.
 */
export default function TeamPalette() {
  const { favoriteTeam } = useUserPrefs();

  useEffect(() => {
    const radice = document.documentElement;
    const variabili = teamThemeStyle(favoriteTeam) as Record<string, string>;
    for (const [nome, valore] of Object.entries(variabili)) {
      radice.style.setProperty(nome, valore);
    }
    return () => {
      for (const nome of Object.keys(variabili)) radice.style.removeProperty(nome);
    };
  }, [favoriteTeam]);

  return null;
}
