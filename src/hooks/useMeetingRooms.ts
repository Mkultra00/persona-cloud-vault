import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MeetingRoom } from "@/lib/roomTypes";
import { toast } from "@/hooks/use-toast";

export function useMeetingRooms() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["meeting_rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_rooms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MeetingRoom[];
    },
  });

  const createRoom = useMutation({
    mutationFn: async (params: {
      name: string; scenario: string; purpose: string;
      user_role: string; duration_minutes: number; persona_ids: string[];
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { data: room, error } = await supabase.from("meeting_rooms").insert({
        name: params.name,
        scenario: params.scenario,
        purpose: params.purpose,
        user_role: params.user_role,
        duration_minutes: params.duration_minutes,
        created_by: user?.id,
        status: "pending",
      } as any).select("*").single();
      if (error) throw error;

      // Add participants
      const participants = params.persona_ids.map(pid => ({
        room_id: (room as any).id,
        persona_id: pid,
      }));
      const { error: pErr } = await supabase.from("room_participants").insert(participants as any);
      if (pErr) throw pErr;

      return room as unknown as MeetingRoom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting_rooms"] });
      toast({ title: "Meeting room created" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create room", description: e.message, variant: "destructive" });
    },
  });

  return { ...query, createRoom };
}
