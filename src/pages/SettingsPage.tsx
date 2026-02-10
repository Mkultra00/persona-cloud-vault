import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { AI_MODELS } from "@/lib/types";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
};

function getProviderForModel(modelValue: string) {
  const m = AI_MODELS.find((x) => x.value === modelValue);
  return m?.provider || "lovable";
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading, upsert } = useSettings();

  const [chatModel, setChatModel] = useState("google/gemini-3-flash-preview");
  const [personaModel, setPersonaModel] = useState("google/gemini-3-flash-preview");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  useEffect(() => {
    if (settings) {
      setChatModel(settings.ai_model);
      setPersonaModel(settings.persona_ai_model || "google/gemini-3-flash-preview");
      setOpenaiKey(settings.openai_api_key || "");
      setGoogleKey(settings.google_api_key || "");
      setAnthropicKey(settings.anthropic_api_key || "");
    }
  }, [settings]);

  const chatProvider = getProviderForModel(chatModel);
  const personaProvider = getProviderForModel(personaModel);
  const needsOpenai = chatProvider === "openai" || personaProvider === "openai";
  const needsGoogle = chatProvider === "google" || personaProvider === "google";
  const needsAnthropic = chatProvider === "anthropic" || personaProvider === "anthropic";

  const lovableModels = AI_MODELS.filter((m) => m.provider === "lovable");
  const openaiModels = AI_MODELS.filter((m) => m.provider === "openai");
  const googleModels = AI_MODELS.filter((m) => m.provider === "google");
  const anthropicModels = AI_MODELS.filter((m) => m.provider === "anthropic");

  const handleSave = () => {
    upsert.mutate({
      ai_provider: chatProvider,
      ai_model: chatModel,
      persona_ai_provider: personaProvider,
      persona_ai_model: personaModel,
      openai_api_key: openaiKey,
      google_api_key: googleKey,
      anthropic_api_key: anthropicKey,
    });
  };

  const ModelSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">Lovable AI (No API key needed)</SelectLabel>
          {lovableModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">OpenAI (Requires API Key)</SelectLabel>
          {openaiModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">Google Gemini (Requires API Key)</SelectLabel>
          {googleModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">Anthropic Claude (Requires API Key)</SelectLabel>
          {anthropicModels.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chat AI Model</CardTitle>
            <CardDescription>
              Choose the AI model for persona conversations. Lovable AI models work out of the box. External models require your own API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={chatModel} onChange={setChatModel} />
            {chatProvider !== "lovable" && (
              <p className="text-xs text-amber-500">⚠️ This model requires your own {PROVIDER_LABELS[chatProvider]} API key (see below).</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona Generation AI</CardTitle>
            <CardDescription>
              Choose the AI model for generating new personas. External models require your own API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={personaModel} onChange={setPersonaModel} />
            {personaProvider !== "lovable" && (
              <p className="text-xs text-amber-500">⚠️ This model requires your own {PROVIDER_LABELS[personaProvider]} API key (see below).</p>
            )}
          </CardContent>
        </Card>

        {(needsOpenai || needsGoogle || needsAnthropic) && (
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Required for the external models you selected above. Keys are stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsOpenai && (
                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <div className="relative">
                    <Input type={showOpenai ? "text" : "password"} placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowOpenai(!showOpenai)}>
                      {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></p>
                </div>
              )}
              {needsGoogle && (
                <div className="space-y-2">
                  <Label>Google Gemini API Key</Label>
                  <div className="relative">
                    <Input type={showGoogle ? "text" : "password"} placeholder="AIza..." value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowGoogle(!showGoogle)}>
                      {showGoogle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a></p>
                </div>
              )}
              {needsAnthropic && (
                <div className="space-y-2">
                  <Label>Anthropic API Key</Label>
                  <div className="relative">
                    <Input type={showAnthropic ? "text" : "password"} placeholder="sk-ant-..." value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowAnthropic(!showAnthropic)}>
                      {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Get your key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {upsert.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </main>
    </div>
  );
}
