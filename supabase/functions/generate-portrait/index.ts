import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { personaId } = await req.json();
    if (!personaId) throw new Error("personaId is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch persona
    const { data: persona, error: fetchErr } = await supabase
      .from("personas")
      .select("identity")
      .eq("id", personaId)
      .single();
    if (fetchErr || !persona) throw new Error("Persona not found");

    const identity = persona.identity as any;
    const prompt = `A professional headshot portrait photo of a ${identity.age}-year-old ${identity.gender} person. ${identity.ethnicity} ethnicity. ${identity.hairColor} hair, ${identity.eyeColor} eyes, ${identity.height} tall. ${identity.distinguishingFeatures?.join(", ") || ""}. They work as a ${identity.occupation}. Photorealistic, soft studio lighting, neutral background, high quality portrait photography.`;

    // Generate image using Nano banana model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) throw new Error("No image generated");

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid image format");

    const ext = base64Match[1];
    const base64Content = base64Match[2];
    const imageBytes = decode(base64Content);

    // Upload to storage
    const filePath = `${personaId}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("portraits")
      .upload(filePath, imageBytes, {
        contentType: `image/${ext}`,
        upsert: true,
      });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from("portraits").getPublicUrl(filePath);

    // Update persona with portrait URL
    const { error: updateErr } = await supabase
      .from("personas")
      .update({ portrait_url: publicUrl, portrait_prompt: prompt })
      .eq("id", personaId);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ portrait_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-portrait error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
