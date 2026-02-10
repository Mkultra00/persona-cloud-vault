import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scenario, purpose, varianceLevel, count } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Get user's AI model preference
    let model = "google/gemini-3-flash-preview";
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

    const systemPrompt = `You are a persona generation engine. Based on the admin's scenario and purpose, generate a complete, realistic human persona. The persona must be internally consistent — their backstory, personality, and current situation should all form a coherent narrative.

CRITICAL NAME RULES:
- Every persona MUST have a unique, randomly generated first and last name.
- Names must be culturally appropriate for the persona's ethnicity and nationality.
- NEVER reuse common placeholder names like "John Smith" or "Jane Doe".
- Each persona in a batch MUST have completely different names from the others.
- Use diverse, creative, realistic names from a wide variety of cultures.

VARIANCE LEVEL: ${varianceLevel}/10
- At level 1-3: Persona closely matches what the scenario implies.
- At level 4-6: Introduce some unexpected but plausible traits.
- At level 7-10: Introduce significant departures. Edge cases, contradictions, unusual combinations. Still coherent, but surprising.

You MUST respond with valid JSON only. No markdown, no explanation. Return an object with these exact keys:
{
  "identity": {
    "firstName": string, "lastName": string, "age": number, "gender": string, "pronouns": string,
    "ethnicity": string, "nationality": string, "city": string, "state": string, "country": string,
    "occupation": string, "employer": string|null, "educationLevel": string, "almaMater": string|null,
    "maritalStatus": string, "incomeRange": string, "hobbies": string[], "techSavviness": "low"|"moderate"|"high"|"expert",
    "hairColor": string, "eyeColor": string, "height": string, "distinguishingFeatures": string[]
  },
  "psychology": {
    "openness": number(0-100), "conscientiousness": number(0-100), "extraversion": number(0-100),
    "agreeableness": number(0-100), "neuroticism": number(0-100),
    "communicationStyle": string, "decisionMakingStyle": string, "conflictStyle": string,
    "trustLevel": number(0-100), "patience": number(0-100), "emotionalExpressiveness": number(0-100),
    "primaryMotivation": string, "secondaryMotivation": string,
    "fears": string[], "frustrations": string[], "aspirations": string[],
    "hiddenAgenda": string, "internalBiases": string[],
    "proactivityLevel": number(0-100), "topicsTheyVolunteer": string[]
  },
  "backstory": {
    "lifeNarrative": string (2-3 paragraphs),
    "keyLifeEvents": [{"event": string, "age": number, "impact": string}],
    "currentLifeSituation": string,
    "recentExperiences": string[]
  }
}`;

    const personas = [];
    const actualCount = Math.min(count || 1, 10);

    for (let i = 0; i < actualCount; i++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Scenario: ${scenario}\n\nTesting Purpose: ${purpose}\n\nGenerate persona ${i + 1} of ${actualCount}. Each persona should be unique.` },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings > Workspace > Usage." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${status}`);
      }

      const aiData = await response.json();
      let content = aiData.choices?.[0]?.message?.content || "";

      // Strip markdown code fences if present
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const personaData = JSON.parse(content);

      // Get user id from token
      let userId = null;
      if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id;
      }

      const { data, error } = await supabase.from("personas").insert({
        created_by: userId,
        generation_prompt: scenario,
        testing_purpose: purpose,
        variance_level: varianceLevel,
        identity: personaData.identity,
        psychology: personaData.psychology,
        backstory: personaData.backstory,
        status: "active",
      }).select().single();

      if (error) throw error;

      // Auto-generate portrait
      try {
        const pid = personaData.identity;
        const portraitPrompt = `A professional headshot portrait photo of a ${pid.age}-year-old ${pid.gender} person. ${pid.ethnicity} ethnicity. ${pid.hairColor} hair, ${pid.eyeColor} eyes, ${pid.height} tall. ${pid.distinguishingFeatures?.join(", ") || ""}. They work as a ${pid.occupation}. Photorealistic, soft studio lighting, neutral background, high quality portrait photography.`;

        const portraitRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: portraitPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (portraitRes.ok) {
          const portraitData = await portraitRes.json();
          const imageUrl = portraitData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imageUrl) {
            const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (base64Match) {
              const ext = base64Match[1];
              const raw = base64Match[2];
              const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
              const filePath = `${data.id}.${ext}`;
              await supabase.storage.from("portraits").upload(filePath, bytes, { contentType: `image/${ext}`, upsert: true });
              const { data: { publicUrl } } = supabase.storage.from("portraits").getPublicUrl(filePath);
              await supabase.from("personas").update({ portrait_url: publicUrl, portrait_prompt: portraitPrompt }).eq("id", data.id);
              data.portrait_url = publicUrl;
            }
          }
        }
      } catch (portraitErr) {
        console.error("Portrait auto-generation failed (non-blocking):", portraitErr);
      }

      personas.push(data);
    }

    return new Response(JSON.stringify({ personas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-persona error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
