import { supabase } from "@/integrations/supabase/client";
import type { Persona } from "@/lib/types";

export async function buildFullPersonaExport(persona: Persona) {
  // Fetch all conversations for this persona
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("persona_id", persona.id)
    .order("started_at", { ascending: true });

  // Fetch all messages for those conversations
  const convIds = (conversations ?? []).map((c) => c.id);
  let allMessages: any[] = [];
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });
    allMessages = msgs ?? [];
  }

  // Group messages by conversation
  const conversationsWithMessages = (conversations ?? []).map((conv) => ({
    id: conv.id,
    status: conv.status,
    session_summary: conv.session_summary,
    started_at: conv.started_at,
    ended_at: conv.ended_at,
    messages: allMessages
      .filter((m) => m.conversation_id === conv.id)
      .map((m) => ({
        role: m.role,
        content: m.content,
        inner_thought: m.inner_thought,
        created_at: m.created_at,
      })),
  }));

  return {
    exportedAt: new Date().toISOString(),
    persona: {
      id: persona.id,
      status: persona.status,
      generation_prompt: persona.generation_prompt,
      testing_purpose: persona.testing_purpose,
      variance_level: persona.variance_level,
      identity: persona.identity,
      psychology: persona.psychology,
      backstory: persona.backstory,
      memory: persona.memory,
      portrait_url: persona.portrait_url,
      total_interactions: persona.total_interactions,
      created_at: persona.created_at,
    },
    conversations: conversationsWithMessages,
  };
}

export function getPersonaFileName(persona: Persona) {
  const id = persona.identity as any;
  const name = id?.firstName && id?.lastName
    ? `${id.firstName}-${id.lastName}`
    : "persona";
  return `${name.toLowerCase().replace(/\s+/g, "-")}-full-export-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function downloadFullPersonaExport(persona: Persona) {
  const data = await buildFullPersonaExport(persona);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getPersonaFileName(persona);
  a.click();
  URL.revokeObjectURL(url);
}
