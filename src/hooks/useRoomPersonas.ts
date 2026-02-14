import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoomPersona } from "@/lib/roomTypes";
import { toast } from "@/hooks/use-toast";

export function useRoomPersonas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["room_personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_personas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RoomPersona[];
    },
  });

  const importPersona = useMutation({
    mutationFn: async (rawData: any) => {
      // Detect full export format
      const isFullExport = rawData.persona && rawData.exportedAt;
      const p = isFullExport ? rawData.persona : rawData;

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
          const fileName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 5)}.${ext}`;
          const { data: uploadData } = await supabase.storage
            .from("portraits")
            .upload(fileName, blob, { contentType: mime });
          if (uploadData?.path) {
            const { data: urlData } = supabase.storage.from("portraits").getPublicUrl(uploadData.path);
            portraitUrl = urlData.publicUrl;
          }
        } catch { /* continue without portrait */ }
      } else if (p.portrait_url) {
        portraitUrl = p.portrait_url;
      }

      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase.from("room_personas").insert({
        identity: p.identity || {},
        psychology: p.psychology || {},
        backstory: p.backstory || {},
        memory: p.memory || {},
        portrait_url: portraitUrl,
        source_export: rawData,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room_personas"] });
      toast({ title: "Persona imported to Social Room" });
    },
    onError: (e: any) => {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    },
  });

  const deletePersona = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_personas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room_personas"] });
      toast({ title: "Persona removed" });
    },
  });

  return { ...query, importPersona, deletePersona };
}
