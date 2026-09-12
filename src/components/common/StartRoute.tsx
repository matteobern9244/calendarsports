import type { ReactNode } from "react";
import { Navigate } from "react-router";
import LandingSpinner from "@/components/common/LandingSpinner";
import { useUserPrefs } from "@/contexts/useUserPrefs";
import { HOME_PATH, startPagePath } from "@/lib/startPage";

/**
 * La radice: non una pagina, ma la decisione su quale pagina mostrare.
 *
 * Chi ha effettuato l'accesso sceglie dove atterrare, e `/` porta li'. La
 * Home non sparisce per questo — vive a `HOME_PATH`, e la voce del menu' ci
 * punta: senza un indirizzo proprio, far vincere la preferenza avrebbe
 * significato renderla irraggiungibile.
 *
 * Quando la preferenza **e'** la Home non si rimbalza da nessuna parte: la si
 * mostra qui, sulla radice. E' il caso di gran lunga piu' frequente — chi non
 * ha l'accesso, piu' chi la Home l'ha scelta — e non deve pagare un
 * reindirizzamento; e' anche cio' che lascia validi i link verso `/` gia' in
 * circolazione.
 *
 * La Home arriva come `children` e non con un import: cosi' il suo corpo gira
 * soltanto quando la si mostra davvero, e un test puo' passarci qualunque
 * cosa. E' la stessa forma di `SectionRoute`.
 */
export default function StartRoute({ children }: { children: ReactNode }) {
  const { startPage, startPageReady, favoriteTeam, sections } = useUserPrefs();

  // La preferenza arriva dalla rete: dipingere la Home mentre non si sa
  // ancora vorrebbe dire mostrarla per un istante e poi saltare altrove.
  // `LandingSpinner` riserva l'altezza, quindi l'attesa non sposta la pagina.
  if (!startPageReady) return <LandingSpinner message="Apertura in corso..." />;

  const destinazione = startPagePath(startPage, favoriteTeam, sections);
  if (destinazione === HOME_PATH) return <>{children}</>;

  // `replace` e non una voce nuova: altrimenti il tasto «indietro» tornerebbe
  // sulla radice, che rimanda subito avanti — una trappola da cui non si esce.
  return <Navigate to={destinazione} replace />;
}
