import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_SYSTEM_PROMPT = `You are a meeting summarizer. Given a meeting transcript, produce a clear, structured summary with the following sections:

## 📋 Meeting Summary

### Participants
List participants.

### Key Discussion Points
Bullet the main topics discussed.

### Notable Moments
Highlight any strong reactions, disagreements, or breakthroughs.

### Outcomes & Conclusions
Summarize what was resolved or left open.

### Tone & Dynamics
Briefly describe the overall tone and interpersonal dynamics.

Keep the summary concise but thorough. Use markdown formatting.`;

async function generateSummary(supabase: any, room: any, room_id: string, endReason: string) {
  const { data: history } = await supabase
    .from("room_messages").select("*").eq("room_id", room_id)
    .order("created_at", { ascending: true }).limit(200);

  const { data: parts } = await supabase
    .from("room_participants").select("persona_id").eq("room_id", room_id);
  const pIds = (parts || []).map((p: any) => p.persona_id);
  const { data: allP } = await supabase
    .from("room_personas").select("id, identity").in("id", pIds);
  const nameMap: Record<string, string> = {};
  (allP || []).forEach((p: any) => {
    const id = p.identity as any;
    nameMap[p.id] = `${id?.firstName || ""} ${id?.lastName || ""}`.trim() || "Unknown";
  });

  const transcript = (history || []).map((m: any) => {
    if (m.role === "system") return `[System]: ${m.content}`;
    if (m.role === "moderator") return `[Moderator]: ${m.content}`;
    if (m.role === "facilitator") return `[Facilitator]: ${m.content}`;
    return `[${nameMap[m.persona_id] || "Unknown"}]: ${m.content}`;
  }).join("\n");

  let summaryContent = `🏁 Meeting ended${endReason}.`;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && transcript.length > 0) {
      const summaryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SUMMARY_SYSTEM_PROMPT },
            { role: "user", content: `Meeting: "${room.name}"\nScenario: ${room.scenario}\nPurpose: ${room.purpose}\n\nTranscript:\n${transcript}` },
          ],
        }),
      });
      if (summaryResp.ok) {
        const sd = await summaryResp.json();
        const st = sd.choices?.[0]?.message?.content || "";
        if (st) summaryContent = `🏁 **Meeting Ended${endReason}**\n\n${st}`;
      }
    }
  } catch (e) { console.error("Summary generation error:", e); }

  return summaryContent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { room_id, action, message, persona_id_to_remove } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: room, error: roomErr } = await supabase
      .from("meeting_rooms").select("*").eq("id", room_id).single();
    if (roomErr || !room) throw new Error("Room not found");

    // === START ===
    if (action === "start") {
      const now = new Date().toISOString();
      await supabase.from("meeting_rooms").update({ status: "active", started_at: now }).eq("id", room_id);
      const sceneMsg = `**Meeting Started** (Duration: ${room.duration_minutes} min)\n\n**Scenario:** ${room.scenario}\n\n**Purpose:** ${room.purpose}`;
      await supabase.from("room_messages").insert({ room_id, role: "system", content: sceneMsg });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === PAUSE ===
    if (action === "pause") {
      await supabase.from("meeting_rooms").update({ status: "paused" }).eq("id", room_id);
      await supabase.from("room_messages").insert({ room_id, role: "system", content: "⏸️ Meeting paused by moderator." });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === RESUME ===
    if (action === "resume") {
      await supabase.from("meeting_rooms").update({ status: "active" }).eq("id", room_id);
      await supabase.from("room_messages").insert({ room_id, role: "system", content: "▶️ Meeting resumed." });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === END ===
    if (action === "end") {
      const summaryContent = await generateSummary(supabase, room, room_id, "");
      await supabase.from("meeting_rooms").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", room_id);
      await supabase.from("room_messages").insert({ room_id, role: "system", content: summaryContent });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === REMOVE PERSONA ===
    if (action === "remove_persona" && persona_id_to_remove) {
      await supabase.from("room_participants").update({ removed_at: new Date().toISOString() })
        .eq("room_id", room_id).eq("persona_id", persona_id_to_remove).is("removed_at", null);
      const { data: removedP } = await supabase.from("room_personas").select("identity").eq("id", persona_id_to_remove).single();
      const name = removedP?.identity?.firstName || "A persona";
      await supabase.from("room_messages").insert({ room_id, role: "system", content: `🚪 ${name} has been removed from the meeting.` });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === DIRECTIVE ===
    if (action === "directive" && message) {
      await supabase.from("room_messages").insert({ room_id, role: "moderator", content: message });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === FACILITATOR MESSAGE ===
    if (action === "facilitator_message" && message) {
      await supabase.from("room_messages").insert({ room_id, role: "facilitator", content: message });
    }

    // === NEXT TURN (or after facilitator message) ===
    if (action === "next_turn" || action === "facilitator_message") {
      if (room.status !== "active") {
        return new Response(JSON.stringify({ ok: false, error: "Room is not active" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check if meeting duration has expired (accelerated clock: 6x speed)
      const TIME_MULTIPLIER = 6;
      if (room.started_at && room.duration_minutes) {
        const startedAt = new Date(room.started_at).getTime();
        const realElapsedMs = Date.now() - startedAt;
        const simulatedElapsedMs = realElapsedMs * TIME_MULTIPLIER;
        const durationMs = room.duration_minutes * 60 * 1000;
        if (simulatedElapsedMs >= durationMs) {
          await supabase.from("room_messages").insert({ room_id, role: "system", content: "⏰ Meeting duration has expired." });
          const summaryContent = await generateSummary(supabase, room, room_id, " (Time Expired)");
          await supabase.from("meeting_rooms").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", room_id);
          await supabase.from("room_messages").insert({ room_id, role: "system", content: summaryContent });
          return new Response(JSON.stringify({ ok: false, ended: true, error: "Meeting duration expired" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Get active participants
      const { data: participants } = await supabase
        .from("room_participants").select("persona_id")
        .eq("room_id", room_id).is("removed_at", null);
      if (!participants?.length) throw new Error("No participants");

      const personaIds = participants.map((p: any) => p.persona_id).sort();

      // Get conversation history
      const { data: history } = await supabase
        .from("room_messages").select("*").eq("room_id", room_id)
        .order("created_at", { ascending: true }).limit(50);

      // Determine next speaker (round-robin)
      const personaMessages = (history || []).filter((m: any) => m.role === "persona" && personaIds.includes(m.persona_id));
      let nextPersonaId: string;
      if (personaMessages.length === 0) {
        nextPersonaId = personaIds[0];
      } else {
        const lastSpeakerId = personaMessages[personaMessages.length - 1].persona_id;
        const lastIdx = personaIds.indexOf(lastSpeakerId);
        nextPersonaId = personaIds[(lastIdx + 1) % personaIds.length];
      }

      // Fetch the persona's full profile
      const { data: persona } = await supabase
        .from("room_personas").select("*").eq("id", nextPersonaId).single();
      if (!persona) throw new Error("Persona not found");

      const identity = persona.identity as any;
      const psychology = persona.psychology as any;
      const backstory = persona.backstory as any;
      const personaName = `${identity?.firstName || ""} ${identity?.lastName || ""}`.trim() || "Unknown";

      // Calculate remaining time info
      let timeInfo = "";
      if (room.started_at && room.duration_minutes) {
        const realElapsedMin = (Date.now() - new Date(room.started_at).getTime()) / 60000;
        const simulatedElapsed = Math.floor(realElapsedMin * TIME_MULTIPLIER);
        const remaining = Math.max(0, room.duration_minutes - simulatedElapsed);
        const pct = Math.round((simulatedElapsed / room.duration_minutes) * 100);
        timeInfo = `\n- Total meeting duration: ${room.duration_minutes} minutes\n- Elapsed: ~${simulatedElapsed} min (${pct}%)\n- Time remaining: ~${remaining} minutes`;
        if (remaining <= 2) timeInfo += "\n- ⚠️ Meeting is about to end! Wrap up your thoughts and offer closing remarks.";
        else if (pct >= 75) timeInfo += "\n- The meeting is nearing its end. Start wrapping up key points.";
      }

      const systemPrompt = `You are ${personaName}, a character in a meeting room discussion. Stay fully in character.

CHARACTER PROFILE:
- Name: ${personaName}
- Age: ${identity?.age || "unknown"}, ${identity?.gender || "unknown"}
- Occupation: ${identity?.occupation || "unknown"}
- City: ${identity?.city || "unknown"}, ${identity?.country || "unknown"}
- Education: ${identity?.educationLevel || "unknown"}
- Hobbies: ${(identity?.hobbies || []).join(", ") || "none listed"}

PERSONALITY (Big Five, 0-100):
- Openness: ${psychology?.openness ?? 50}, Conscientiousness: ${psychology?.conscientiousness ?? 50}
- Extraversion: ${psychology?.extraversion ?? 50}, Agreeableness: ${psychology?.agreeableness ?? 50}
- Neuroticism: ${psychology?.neuroticism ?? 50}
- Communication style: ${psychology?.communicationStyle || "direct"}
- Trust level: ${psychology?.trustLevel ?? 50}/100
- Primary motivation: ${psychology?.primaryMotivation || "unknown"}
- Fears: ${(psychology?.fears || []).join(", ") || "none"}
- Hidden agenda: ${psychology?.hiddenAgenda || "none"}

BACKSTORY:
${backstory?.lifeNarrative || "No backstory available."}
Current situation: ${backstory?.currentLifeSituation || "unknown"}

MEETING CONTEXT:
- Scenario: ${room.scenario}
- Purpose: ${room.purpose}${timeInfo}

INSTRUCTIONS:
1. Respond naturally in character as ${personaName}. Keep responses concise (2-4 sentences typically).
2. React to what others have said. Reference specific points made by other participants.
3. Your response should reflect your personality traits, communication style, and motivations.
4. After your spoken response, provide your inner thoughts in a separate section.

FORMAT YOUR RESPONSE EXACTLY AS:
RESPONSE: [Your spoken words in the meeting]
INNER_THOUGHT: [Your private inner thoughts about what's happening]`;

      const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
      
      const { data: allPersonas } = await supabase
        .from("room_personas").select("id, identity").in("id", personaIds);
      const nameMap: Record<string, string> = {};
      (allPersonas || []).forEach((p: any) => {
        const id = p.identity as any;
        nameMap[p.id] = `${id?.firstName || ""} ${id?.lastName || ""}`.trim() || "Unknown";
      });

      for (const msg of (history || [])) {
        if (msg.role === "system" || msg.role === "moderator") {
          aiMessages.push({ role: "user", content: `[System/Moderator]: ${msg.content}` });
        } else if (msg.role === "facilitator") {
          aiMessages.push({ role: "user", content: `[Facilitator]: ${msg.content}` });
        } else if (msg.role === "persona") {
          const speakerName = nameMap[msg.persona_id] || "Unknown";
          if (msg.persona_id === nextPersonaId) {
            aiMessages.push({ role: "assistant", content: `${msg.content}` });
          } else {
            aiMessages.push({ role: "user", content: `[${speakerName}]: ${msg.content}` });
          }
        }
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: aiMessages }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI error:", aiResp.status, errText);
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "";

      let content = rawContent;
      let innerThought: string | null = null;
      const responseMatch = rawContent.match(/RESPONSE:\s*([\s\S]*?)(?=INNER_THOUGHT:|$)/i);
      const thoughtMatch = rawContent.match(/INNER_THOUGHT:\s*([\s\S]*?)$/i);
      if (responseMatch) content = responseMatch[1].trim();
      if (thoughtMatch) innerThought = thoughtMatch[1].trim();

      const { data: savedMsg } = await supabase.from("room_messages").insert({
        room_id, persona_id: nextPersonaId, role: "persona",
        content, inner_thought: innerThought,
      }).select("*").single();

      return new Response(JSON.stringify({ ok: true, message: savedMsg, persona_name: personaName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("room-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
