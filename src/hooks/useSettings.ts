import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;
      const { data } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (settings: { ai_provider: string; ai_model: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("admin_settings").upsert({
        user_id: user.id,
        ...settings,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_settings"] });
      toast({ title: "Settings saved" });
    },
  });

  return { ...query, upsert };
}
