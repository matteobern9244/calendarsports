import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERIE_A_TEAMS, type SerieATeam } from "@/lib/serieATeams";

/**
 * Le squadre in ordine alfabetico italiano, non di classifica: la classifica
 * cambia ogni domenica e sposterebbe le voci sotto il dito di chi sta
 * scegliendo. Oggi il dataset e' gia' alfabetico, quindi questo ordinamento
 * non cambia niente: e' l'ordine a restare garantito se un domani l'elenco
 * venisse riscritto in un altro ordine.
 */
const COLLATORE = new Intl.Collator("it");
const SQUADRE_IN_ORDINE = [...SERIE_A_TEAMS].sort((a, b) => COLLATORE.compare(a.name, b.name));

interface TeamSelectProps {
  /** La squadra **gia' risolta**: il tipo impedisce di passare una stringa qualunque. */
  value: SerieATeam;
  /** Riceve lo **slug**, che e' la forma in cui la preferenza viene conservata. */
  onChange: (slug: string) => void;
}

/**
 * La tendina della squadra preferita.
 *
 * Vive in un file a se' perche' e' l'unico pezzo del pannello che ha un
 * contratto proprio da verificare — mostrare la preferenza e restituire uno
 * slug — e perche' dentro `PreferencesPanel` servirebbero cinque contesti
 * finti per arrivarci.
 *
 * E' **pilotata** (`value`, non `defaultValue`): la preferenza cambia anche
 * da fuori, quando il profilo arriva dal server al primo accesso o quando un
 * salvataggio rifiutato viene annullato.
 */
export default function TeamSelect({ value, onChange }: TeamSelectProps) {
  return (
    <Select value={value.slug} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Squadra di calcio preferita"
        className="w-full border-border/60 bg-background/60 focus:ring-[hsl(var(--gold))]/60"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SQUADRE_IN_ORDINE.map((team) => (
          <SelectItem key={team.slug} value={team.slug}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
