import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/useAuth";

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

const PROFILE_COLUMNS = "id, display_name, theme, favorite_team, show_sinner, show_f1, show_motogp";

/** Legge il profilo dell'utente autenticato. Senza sessione non interroga nulla. */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["profile", userId],
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

/** Aggiorna il profilo dell'utente autenticato. */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

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
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(["profile", userId], data);
    },
  });
}
