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
    mutationFn: async (rawData: any) => {
      const user = (await supabase.auth.getUser()).data.user;

      // Detect full export format (single persona with conversations)
      const isFullExport = rawData.persona && rawData.exportedAt;
      const personaList = isFullExport ? [rawData.persona] : (Array.isArray(rawData) ? rawData : [rawData]);
      const conversationsList = isFullExport ? rawData.conversations || [] : [];

      for (const p of personaList) {
        const identity = { ...(p.identity || {}) };
        const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        if (identity.firstName) identity.firstName = `${identity.firstName}-${suffix}`;

        // Restore portrait from base64 if available
        let portraitUrl: string | null = null;
        if (p.portrait_base64) {
          try {
            const base64 = p.portrait_base64;
            const mimeMatch = base64.match(/data:(.*?);base64,/);
            const mime = mimeMatch?.[1] || "image/png";
            const ext = mime.split("/")[1] || "png";
            const byteString = atob(base64.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const blob = new Blob([ab], { type: mime });
            const fileName = `imported-${Date.now()}-${suffix}.${ext}`;
            const { data: uploadData } = await supabase.storage
              .from("portraits")
              .upload(fileName, blob, { contentType: mime });
            if (uploadData?.path) {
              const { data: urlData } = supabase.storage.from("portraits").getPublicUrl(uploadData.path);
              portraitUrl = urlData.publicUrl;
            }
          } catch {
            // Portrait upload failed, continue without it
          }
        }

        const { data: inserted, error } = await supabase.from("personas").insert({
          generation_prompt: p.generation_prompt || "",
          testing_purpose: p.testing_purpose || "",
          variance_level: p.variance_level || 5,
          identity,
          psychology: p.psychology || {},
          backstory: p.backstory || {},
          memory: p.memory || {},
          portrait_url: portraitUrl,
          status: "active",
          created_by: user?.id,
        }).select("id").single();
        if (error) throw error;

        // Restore conversations and messages
        if (inserted && conversationsList.length > 0) {
          for (const conv of conversationsList) {
            const { data: newConv, error: convErr } = await supabase.from("conversations").insert({
              persona_id: inserted.id,
              user_id: user?.id,
              status: conv.status || "ended",
              session_summary: conv.session_summary,
              started_at: conv.started_at,
              ended_at: conv.ended_at,
            }).select("id").single();
            if (convErr || !newConv) continue;

            const msgs = (conv.messages || []).map((m: any) => ({
              conversation_id: newConv.id,
              role: m.role,
              content: m.content,
              inner_thought: m.inner_thought || null,
              created_at: m.created_at,
            }));
            if (msgs.length > 0) {
              await supabase.from("messages").insert(msgs);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      toast({ title: "Persona imported successfully (with chat history & portrait)" });
    },
    onError: (e: any) => {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    },
  });

  return { ...query, deleteMutation, importPersonas };
}
