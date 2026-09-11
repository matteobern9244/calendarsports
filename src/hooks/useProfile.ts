import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export interface Profile {
  id: string;
  display_name: string | null;
  theme: "light" | "dark";
  favorite_team: string;
  show_sinner: boolean;
  show_f1: boolean;
  show_motogp: boolean;
}

export type ProfilePatch = Partial<Omit<Profile, "id">>;
type CampoProfilo = keyof ProfilePatch;

const PROFILE_COLUMNS = "id, display_name, theme, favorite_team, show_sinner, show_f1, show_motogp";

/**
 * I campi che una richiesta dichiara davvero di voler cambiare.
 *
 * Un `undefined` non e' una modifica: `update({ theme: undefined })` non
 * cambia niente sul server, e trattarlo come modifica scriverebbe `undefined`
 * in cache — cioe' un profilo con un buco, che nessuna lettura ha mai
 * prodotto.
 */
function chiaviToccate(patch: ProfilePatch): CampoProfilo[] {
  return (Object.keys(patch) as CampoProfilo[]).filter((chiave) => patch[chiave] !== undefined);
}

/** Solo quei campi, letti da `fonte`. */
function soloQueste(chiavi: CampoProfilo[], fonte: ProfilePatch): ProfilePatch {
  return Object.fromEntries(chiavi.map((chiave) => [chiave, fonte[chiave]])) as ProfilePatch;
}

/** Legge il profilo dell'utente autenticato. Senza sessione non interroga nulla. */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: queryKeys.profile(userId),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;

      // Rete di sicurezza se il profilo non fosse ancora stato creato.
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: userId })
        .select(PROFILE_COLUMNS)
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    },
  });
}

/**
 * Aggiorna il profilo dell'utente autenticato, in anticipo sul server.
 *
 * Senza anticipo la preferenza non e' lenta: e' **sbagliata**. `UserPrefsContext`
 * legge `profile.favorite_team` prima del valore locale, quindi dal clic fino
 * alla risposta della rete la pagina continua a mostrare la squadra
 * precedente come se fosse quella scelta — senza spinner e senza errore.
 *
 * La regola, in avanti e all'indietro, e' che **una richiesta possiede
 * esattamente i campi che ha toccato**. Tema, squadra e sezioni si salvano con
 * tre richieste separate, che sulla pagina delle preferenze partono a un
 * istante di distanza l'una dall'altra; fotografare e rimettere a posto
 * l'intero profilo — la ricetta consueta — farebbe disfare al fallimento di
 * una la modifica accanto che il server aveva gia' accettato. Vale anche per
 * il successo: la riga che il server restituisce e' stata letta prima che la
 * richiesta accanto fosse scritta, quindi copiarla per intero in cache
 * riporterebbe indietro l'altro campo.
 *
 * Non c'e' `onSettled` con `invalidateQueries` di proposito. Per i campi che
 * la riguardano ogni richiesta finisce con un valore autorevole in mano — la
 * risposta del server, o l'ultimo valore letto — quindi la rilettura non
 * aggiungerebbe verita'; aggiungerebbe pero' un giro di rete capace di
 * atterrare in mezzo a un'altra richiesta ancora in volo e di cancellarne
 * l'anticipo.
 */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const chiave = queryKeys.profile(userId);

  return useMutation({
    mutationFn: async (patch: ProfilePatch): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      return data as Profile;
    },

    onMutate: async (patch: ProfilePatch) => {
      if (!userId) return { precedente: null };
      // Una lettura gia' in volo risponderebbe con la riga di prima e
      // cancellerebbe l'anticipo senza lasciare traccia.
      await queryClient.cancelQueries({ queryKey: chiave });
      const inCache = queryClient.getQueryData<Profile>(chiave);
      // Prima della prima lettura non c'e' niente da aggiornare: un profilo
      // costruito dal solo `patch` sarebbe fatto per meta' di valori inventati.
      if (!inCache) return { precedente: null };
      const chiavi = chiaviToccate(patch);
      queryClient.setQueryData<Profile>(chiave, { ...inCache, ...soloQueste(chiavi, patch) });
      return { precedente: soloQueste(chiavi, inCache) };
    },

    onError: (_errore, _patch, contesto) => {
      const precedente = contesto?.precedente;
      if (!precedente) return;
      queryClient.setQueryData<Profile>(chiave, (attuale) =>
        attuale ? { ...attuale, ...precedente } : attuale,
      );
    },

    onSuccess: (data, patch) => {
      if (!data) return;
      queryClient.setQueryData<Profile>(chiave, (attuale) =>
        attuale ? { ...attuale, ...soloQueste(chiaviToccate(patch), data) } : data,
      );
    },
  });
}
