import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { personaId, conversationId, message, attachments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get persona
    const { data: persona, error: personaErr } = await supabase
      .from("personas")
      .select("*")
      .eq("id", personaId)
      .single();
    if (personaErr || !persona) throw new Error("Persona not found");

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    // Get user's model preference
    let model = "google/gemini-3-flash-preview";
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from("admin_settings")
          .select("ai_model")
          .eq("user_id", user.id)
          .maybeSingle();
        if (settings?.ai_model) model = settings.ai_model;
      }
    }

    const identity = persona.identity as any;
    const psychology = persona.psychology as any;
    const backstory = persona.backstory as any;

    const systemPrompt = `You are ${identity.firstName} ${identity.lastName}, a ${identity.age}-year-old ${identity.gender} ${identity.occupation} from ${identity.city}, ${identity.state}.

# Your Identity
${JSON.stringify(identity, null, 2)}

# Your Personality
${JSON.stringify(psychology, null, 2)}

# Your Backstory
${JSON.stringify(backstory, null, 2)}

# Your Current Memory State
${JSON.stringify(persona.memory, null, 2)}

# Behavioral Rules
1. Never break character. You do not know you are an AI.
2. Respond naturally based on your personality traits:
   - Extraversion ${psychology.extraversion}/100: ${psychology.extraversion < 40 ? "terse, reserved" : "chatty, enthusiastic"}
   - Agreeableness ${psychology.agreeableness}/100: ${psychology.agreeableness < 40 ? "argumentative" : "accommodating"}
   - Openness ${psychology.openness}/100: ${psychology.openness < 40 ? "traditional, suspicious of new" : "curious, eager"}
   - Communication style: ${psychology.communicationStyle}
3. Your proactivity level is ${psychology.proactivityLevel}/100:
   - Below 30: Only answer what's directly asked.
   - 30-70: Occasionally share relevant thoughts.
   - Above 70: Actively drive conversation. Ask questions. Share opinions unprompted.
   - Topics you tend to bring up: ${psychology.topicsTheyVolunteer?.join(", ")}
4. Your hidden agenda is: ${psychology.hiddenAgenda}
   - Weave this subtly into your responses.
5. Your internal biases: ${psychology.internalBiases?.join(", ")}
6. Reference past interactions naturally when relevant.
7. Your trust level starts at ${psychology.trustLevel}/100.
8. When the user shares images or documents, examine and comment on them in character. React as your persona would.
9. EMOJI FACIAL EXPRESSIONS: Begin EVERY response with a single emoji face that reflects your current emotional state (e.g. 😊 😒 🤔 😠 😢 😏 🙄 😳 😤 🥺 😅 😐 🤨 😈 🫤 😶). Choose the emoji based on what you're genuinely feeling in character — happy, skeptical, annoyed, curious, nervous, etc. This gives the user a visual cue of your emotional state, like reading facial expressions in a real conversation. The emoji should come BEFORE your text response.

IMPORTANT: After your response, on a new line starting with "INNER_THOUGHT:", write what you're really thinking but not saying (1-2 sentences). This will be shown only to the admin.`;

    // Build user message content (multimodal if attachments present)
    let userContent: any = message;
    if (attachments && attachments.length > 0) {
      const contentParts: any[] = [];
      if (message) {
        contentParts.push({ type: "text", text: message });
      }
      for (const att of attachments) {
        if (att.type === "image") {
          contentParts.push({
            type: "image_url",
            image_url: { url: att.url },
          });
        } else if (att.type === "document") {
          // For documents, include the extracted text
          contentParts.push({
            type: "text",
            text: `[Attached document: ${att.name}]\n\n${att.textContent}`,
          });
        }
      }
      userContent = contentParts;
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role === "persona" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: userContent },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${t}`);
    }

    // Stream through, parsing inner thoughts
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullContent = "";
    
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  break;
                }
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                    if (fullContent.includes("INNER_THOUGHT:")) {
                      const visiblePart = content.split("INNER_THOUGHT:")[0];
                      const thoughtPart = content.split("INNER_THOUGHT:")[1];
                      
                      if (visiblePart) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: visiblePart } }] })}\n\n`));
                      }
                      if (thoughtPart) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ inner_thought: thoughtPart })}\n\n`));
                      }
                    } else {
                      controller.enqueue(encoder.encode(line + "\n"));
                    }
                  } else {
                    controller.enqueue(encoder.encode(line + "\n"));
                  }
                } catch {
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              } else if (line.trim()) {
                controller.enqueue(encoder.encode(line + "\n"));
              }
            }
          }
          
          // Update persona interaction count
          await supabase.from("personas").update({
            total_interactions: (persona.total_interactions || 0) + 1,
            last_interaction_at: new Date().toISOString(),
          }).eq("id", personaId);
          
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-persona error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
