import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

export function usePersonas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Persona[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      toast({ title: "Persona deleted" });
    },
  });

  const importPersonas = useMutation({
    mutationFn: async (personas: any[]) => {
      const user = (await supabase.auth.getUser()).data.user;
      const toInsert = personas.map((p: any) => {
        const identity = { ...(p.identity || {}) };
        // Randomize name suffix to ensure uniqueness
        const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        if (identity.firstName) identity.firstName = `${identity.firstName}-${suffix}`;
        return {
          generation_prompt: p.generation_prompt || "",
          testing_purpose: p.testing_purpose || "",
          variance_level: p.variance_level || 5,
          identity,
          psychology: p.psychology || {},
          backstory: p.backstory || {},
          memory: p.memory || {},
          portrait_url: null, // Force new portrait generation
          status: "active",
          created_by: user?.id,
        };
      });
      const { error } = await supabase.from("personas").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      toast({ title: "Personas imported successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    },
  });

  return { ...query, deleteMutation, importPersonas };
}
