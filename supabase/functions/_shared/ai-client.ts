// Shared AI client that routes to the correct provider
export interface ProviderConfig {
  provider: string;
  model: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  anthropicApiKey?: string;
}

export async function fetchAICompletion(
  config: ProviderConfig,
  messages: { role: string; content: any }[],
  options: { stream?: boolean; modalities?: string[] } = {}
): Promise<Response> {
  const { provider, model, openaiApiKey, googleApiKey, anthropicApiKey } = config;

  if (provider === "openai") {
    if (!openaiApiKey) throw new Error("OpenAI API key not configured. Go to Settings to add it.");
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: options.stream ?? false }),
    });
  }

  if (provider === "google") {
    if (!googleApiKey) throw new Error("Google Gemini API key not configured. Go to Settings to add it.");
    return fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: options.stream ?? false }),
    });
  }

  if (provider === "anthropic") {
    if (!anthropicApiKey) throw new Error("Anthropic API key not configured. Go to Settings to add it.");
    // Convert OpenAI-style messages to Anthropic format
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "persona" ? "assistant" : m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const body: any = {
      model,
      max_tokens: 4096,
      messages: nonSystemMsgs,
      stream: options.stream ?? false,
    };
    if (systemMsg) body.system = typeof systemMsg.content === "string" ? systemMsg.content : JSON.stringify(systemMsg.content);

    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  // Default: Lovable AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  const body: any = { model, messages, stream: options.stream ?? false };
  if (options.modalities) body.modalities = options.modalities;
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Helper to get provider config from admin_settings
export async function getProviderConfig(
  supabase: any,
  userId: string | null,
  type: "chat" | "persona" = "chat"
): Promise<ProviderConfig> {
  const defaults: ProviderConfig = { provider: "lovable", model: "google/gemini-3-flash-preview" };
  if (!userId) return defaults;

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("ai_provider, ai_model, persona_ai_provider, persona_ai_model, openai_api_key, google_api_key, anthropic_api_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) return defaults;

  const provider = type === "persona" ? (settings.persona_ai_provider || settings.ai_provider) : settings.ai_provider;
  const model = type === "persona" ? (settings.persona_ai_model || settings.ai_model) : settings.ai_model;

  return {
    provider: provider || "lovable",
    model: model || "google/gemini-3-flash-preview",
    openaiApiKey: settings.openai_api_key || undefined,
    googleApiKey: settings.google_api_key || undefined,
    anthropicApiKey: settings.anthropic_api_key || undefined,
  };
}
