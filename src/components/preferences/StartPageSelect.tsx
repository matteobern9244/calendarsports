import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sections } from "@/contexts/useUserPrefs";
import { startPageOptions, type StartPage } from "@/lib/startPage";

interface StartPageSelectProps {
  /**
   * La pagina **gia' effettiva**, non quella grezza del profilo: e' cio' che
   * risponde alla domanda «dove si apre l'app», ed e' anche l'unico valore
   * garantito di trovarsi fra le voci offerte.
   */
  value: StartPage;
  /** Serve a non offrire una pagina che l'utente ha nascosto. */
  sections: Sections;
  onChange: (value: StartPage) => void;
}

/**
 * La tendina della pagina iniziale.
 *
 * Vive in un file a se' per la stessa ragione di `TeamSelect`: ha un
 * contratto proprio da verificare, e dentro `PreferencesPanel` servirebbero
 * cinque contesti finti per arrivarci.
 *
 * E' **pilotata** (`value`, non `defaultValue`): la preferenza cambia anche
 * da fuori — il profilo che arriva dal server, un salvataggio rifiutato che
 * viene annullato, una sezione nascosta che la fa ripiegare sulla Home.
 *
 * L'ordine delle voci e' quello di `START_PAGES`, che e' l'ordine del menu:
 * non alfabetico, perche' qui l'elenco non e' un dizionario ma il percorso
 * che l'utente ha gia' in testa guardando l'intestazione.
 */
export default function StartPageSelect({ value, sections, onChange }: StartPageSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as StartPage)}>
      <SelectTrigger
        aria-label="Pagina iniziale"
        className="w-full border-border/60 bg-background/60 focus:ring-[hsl(var(--gold))]/60"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {startPageOptions(sections).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
