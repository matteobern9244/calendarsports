import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { START_PAGES, type StartPage } from "@/lib/startPage";

interface StartPageSelectProps {
  value: StartPage;
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
 * da fuori — il profilo che arriva dal server, o un salvataggio rifiutato che
 * viene annullato.
 *
 * Offre tutte e sette le voci, anche quelle nascoste dal menu': nascondere
 * riguarda l'intestazione e nient'altro, e togliere una voce da qui vorrebbe
 * dire che riordinare il menu' cambia anche dove l'app si apre.
 *
 * L'ordine delle voci e' quello di `START_PAGES`, che e' l'ordine del menu:
 * non alfabetico, perche' qui l'elenco non e' un dizionario ma il percorso
 * che l'utente ha gia' in testa guardando l'intestazione.
 */
export default function StartPageSelect({ value, onChange }: StartPageSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as StartPage)}>
      <SelectTrigger
        aria-label="Pagina iniziale"
        className="w-full border-border/60 bg-background/60 focus:ring-[hsl(var(--gold))]/60"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {START_PAGES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
