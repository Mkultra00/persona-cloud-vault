import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchAICompletion, getProviderConfig } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scenario, purpose, varianceLevel, count, knowledgeAttachments } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Get provider config for persona generation
    const providerConfig = await getProviderConfig(supabase, userId, "persona");

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
    "hiddenAgenda": string, "deepSecrets": string[], "embarrassingMoments": string[], "mentalHealthChallenges": string[], "physicalHealthChallenges": string[], "internalBiases": string[],
    "proactivityLevel": number(0-100), "topicsTheyVolunteer": string[]
  },
  "backstory": {
    "lifeNarrative": string (2-3 paragraphs),
    "keyLifeEvents": [{"event": string, "age": number, "impact": string}],
    "currentLifeSituation": string,
    "recentExperiences": string[],
    "educationHistory": [{"institution": string, "degree": string, "fieldOfStudy": string, "yearStarted": number, "yearEnded": number|null, "highlights": string[]}],
    "occupationHistory": [{"title": string, "employer": string, "yearStarted": number, "yearEnded": number|null, "description": string}]
  }
}`;

    // Fetch existing persona first names to avoid duplicates
    const { data: existingPersonas } = await supabase
      .from("personas")
      .select("identity");
    const existingNames = (existingPersonas || [])
      .map((p: any) => p.identity?.firstName)
      .filter(Boolean);

    // Build knowledge context from attachments
    let knowledgeContext = "";
    const imageAttachments: { type: string; image_url: { url: string } }[] = [];
    if (knowledgeAttachments && knowledgeAttachments.length > 0) {
      for (const att of knowledgeAttachments) {
        if (att.type === "document" && att.textContent) {
          knowledgeContext += `\n\n--- Document: ${att.name} ---\n${att.textContent}`;
        } else if (att.type === "image" && att.url) {
          imageAttachments.push({ type: "image_url", image_url: { url: att.url } });
        }
      }
    }

    // Step 1: Research phase — gather contextual knowledge about the scenario
    console.log("Starting research phase for scenario:", scenario);
    const researchPrompt = `You are a research analyst. Given a scenario and testing purpose, produce a detailed research brief that will help create realistic personas. Cover:

1. **Industry/Domain Context**: Key facts, terminology, common roles, typical challenges in this domain.
2. **Demographics**: Who are the real people in this scenario? Age ranges, education levels, income brackets, geographic distribution, cultural backgrounds.
3. **Behavioral Patterns**: How do real people in this scenario typically behave? What are their motivations, pain points, daily routines?
4. **Psychographic Insights**: Common attitudes, values, communication styles, tech adoption levels.
5. **Edge Cases**: Unusual but realistic profiles that might exist in this scenario — people who defy stereotypes or have unexpected backgrounds.
6. **Current Trends**: Any relevant societal, technological, or economic trends that would shape these personas today.

Be specific and data-informed. Use your knowledge to ground the research in reality.${knowledgeContext ? " Pay special attention to the attached documents/images as they contain domain-specific knowledge." : ""}`;

    const researchUserContent: any[] = [
      { type: "text", text: `Scenario: ${scenario}\n\nTesting Purpose: ${purpose}${knowledgeContext ? `\n\nATTACHED KNOWLEDGE:\n${knowledgeContext}` : ""}\n\nProvide a comprehensive research brief.` },
      ...imageAttachments,
    ];

    const researchResponse = await fetchAICompletion(providerConfig, [
      { role: "system", content: researchPrompt },
      { role: "user", content: researchUserContent.length === 1 ? researchUserContent[0].text : researchUserContent },
    ]);

    let researchBrief = "";
    if (researchResponse.ok) {
      const researchData = await researchResponse.json();
      researchBrief = researchData.choices?.[0]?.message?.content || "";
      console.log("Research phase complete, brief length:", researchBrief.length);
    } else {
      console.warn("Research phase failed (non-blocking), proceeding without research:", researchResponse.status);
    }

    // Step 2: Generate personas informed by research
    const personas = [];
    const actualCount = Math.min(count || 1, 10);
    const newNames: string[] = [];

    for (let i = 0; i < actualCount; i++) {
      const genTextContent = `Scenario: ${scenario}\n\nTesting Purpose: ${purpose}\n\n${researchBrief ? `RESEARCH BRIEF (use this to ground the persona in reality):\n${researchBrief}\n\n` : ""}${knowledgeContext ? `ATTACHED KNOWLEDGE:\n${knowledgeContext}\n\n` : ""}Generate persona ${i + 1} of ${actualCount}. Each persona should be unique and grounded in the research above.\n\nIMPORTANT: Do NOT use any of these first names (they are already taken): ${[...existingNames, ...newNames].join(", ") || "none yet"}`;

      const genUserContent: any[] = [
        { type: "text", text: genTextContent },
        ...imageAttachments,
      ];

      const response = await fetchAICompletion(providerConfig, [
        { role: "system", content: systemPrompt },
        { role: "user", content: genUserContent.length === 1 ? genUserContent[0].text : genUserContent },
      ]);

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
      if (personaData.identity?.firstName) newNames.push(personaData.identity.firstName);

      // userId already resolved above

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

        // Portrait always uses Lovable AI (image gen)
        const portraitRes = await fetchAICompletion(
          { provider: "lovable", model: "google/gemini-2.5-flash-image" },
          [{ role: "user", content: portraitPrompt }],
          { modalities: ["image", "text"] }
        );

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
