import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MeetingRoom, RoomMessage, RoomPersona } from "@/lib/roomTypes";
import { toast } from "@/hooks/use-toast";

export function useMeetingRoom(roomId: string) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const autoRunRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Fetch room
  const roomQuery = useQuery({
    queryKey: ["meeting_room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_rooms").select("*").eq("id", roomId).single();
      if (error) throw error;
      return data as unknown as MeetingRoom;
    },
  });

  // Fetch participants with persona data
  const participantsQuery = useQuery({
    queryKey: ["room_participants", roomId],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", roomId)
        .is("removed_at", null);
      if (!parts?.length) return [];
      const personaIds = parts.map((p: any) => p.persona_id);
      const { data: personas } = await supabase
        .from("room_personas")
        .select("*")
        .in("id", personaIds);
      return (personas || []) as unknown as RoomPersona[];
    },
  });

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMessages((data || []) as unknown as RoomMessage[]);
    };
    fetchMessages();

    // Subscribe to realtime
    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as unknown as RoomMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const callAction = useCallback(async (action: string, extra: any = {}) => {
    const resp = await supabase.functions.invoke("room-conversation", {
      body: { room_id: roomId, action, ...extra },
    });
    if (resp.error) {
      toast({ title: "Error", description: resp.error.message, variant: "destructive" });
      return null;
    }
    if (resp.data?.error) {
      toast({ title: "Error", description: resp.data.error, variant: "destructive" });
      return null;
    }
    return resp.data;
  }, [roomId]);

  const startMeeting = useCallback(async () => {
    await callAction("start");
    queryClient.invalidateQueries({ queryKey: ["meeting_room", roomId] });
    // Start auto-generating turns
    autoRunRef.current = true;
    generateNextTurnLoop();
  }, [callAction, roomId]);

  const generateNextTurn = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await callAction("next_turn");
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, [callAction]);

  const generateNextTurnLoop = useCallback(async () => {
    if (!autoRunRef.current) return;
    setIsGenerating(true);
    try {
      const result = await callAction("next_turn");
      if (!result?.ok || result?.ended) {
        autoRunRef.current = false;
        if (result?.ended) {
          queryClient.invalidateQueries({ queryKey: ["meeting_room", roomId] });
        }
        setIsGenerating(false);
        return;
      }
    } catch {
      autoRunRef.current = false;
      setIsGenerating(false);
      return;
    }
    setIsGenerating(false);
    // Schedule next turn with delay
    if (autoRunRef.current) {
      timerRef.current = window.setTimeout(generateNextTurnLoop, 3000);
    }
  }, [callAction, roomId]);

  const pauseMeeting = useCallback(async () => {
    autoRunRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    await callAction("pause");
    queryClient.invalidateQueries({ queryKey: ["meeting_room", roomId] });
  }, [callAction, roomId]);

  const resumeMeeting = useCallback(async () => {
    await callAction("resume");
    queryClient.invalidateQueries({ queryKey: ["meeting_room", roomId] });
    autoRunRef.current = true;
    generateNextTurnLoop();
  }, [callAction, roomId, generateNextTurnLoop]);

  const endMeeting = useCallback(async () => {
    autoRunRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    await callAction("end");
    queryClient.invalidateQueries({ queryKey: ["meeting_room", roomId] });
  }, [callAction, roomId]);

  const sendDirective = useCallback(async (message: string) => {
    await callAction("directive", { message });
  }, [callAction]);

  const sendFacilitatorMessage = useCallback(async (message: string) => {
    setIsGenerating(true);
    try {
      await callAction("facilitator_message", { message });
    } finally {
      setIsGenerating(false);
    }
  }, [callAction]);

  const removePersona = useCallback(async (personaId: string) => {
    await callAction("remove_persona", { persona_id_to_remove: personaId });
    queryClient.invalidateQueries({ queryKey: ["room_participants", roomId] });
  }, [callAction, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoRunRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    room: roomQuery.data,
    roomLoading: roomQuery.isLoading,
    participants: participantsQuery.data || [],
    messages,
    isGenerating,
    startMeeting,
    pauseMeeting,
    resumeMeeting,
    endMeeting,
    generateNextTurn,
    sendDirective,
    sendFacilitatorMessage,
    removePersona,
  };
}
