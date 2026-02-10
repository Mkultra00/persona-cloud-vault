import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { AI_MODELS, AI_PROVIDERS } from "@/lib/types";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading, upsert } = useSettings();

  const [chatProvider, setChatProvider] = useState("lovable");
  const [chatModel, setChatModel] = useState("google/gemini-3-flash-preview");
  const [personaProvider, setPersonaProvider] = useState("lovable");
  const [personaModel, setPersonaModel] = useState("google/gemini-3-flash-preview");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    if (settings) {
      setChatProvider(settings.ai_provider);
      setChatModel(settings.ai_model);
      setPersonaProvider(settings.persona_ai_provider || "lovable");
      setPersonaModel(settings.persona_ai_model || "google/gemini-3-flash-preview");
      setOpenaiKey(settings.openai_api_key || "");
      setGoogleKey(settings.google_api_key || "");
    }
  }, [settings]);

  const chatModels = AI_MODELS.filter((m) => m.provider === chatProvider);
  const personaModels = AI_MODELS.filter((m) => m.provider === personaProvider);

  // Reset model when provider changes
  const handleChatProviderChange = (v: string) => {
    setChatProvider(v);
    const first = AI_MODELS.find((m) => m.provider === v);
    if (first) setChatModel(first.value);
  };
  const handlePersonaProviderChange = (v: string) => {
    setPersonaProvider(v);
    const first = AI_MODELS.find((m) => m.provider === v);
    if (first) setPersonaModel(first.value);
  };

  const needsOpenai = chatProvider === "openai" || personaProvider === "openai";
  const needsGoogle = chatProvider === "google" || personaProvider === "google";

  const handleSave = () => {
    upsert.mutate({
      ai_provider: chatProvider,
      ai_model: chatModel,
      persona_ai_provider: personaProvider,
      persona_ai_model: personaModel,
      openai_api_key: openaiKey,
      google_api_key: googleKey,
    });
  };

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
        {/* Chat AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Chat AI Configuration</CardTitle>
            <CardDescription>
              Choose which AI model powers persona conversations. Lovable AI is the default — no API key needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={chatProvider} onValueChange={handleChatProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={chatModel} onValueChange={setChatModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {chatModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Persona Generation AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Persona Generation AI</CardTitle>
            <CardDescription>
              Choose which AI model generates new personas. Can differ from the chat model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={personaProvider} onValueChange={handlePersonaProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={personaModel} onValueChange={setPersonaModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {personaModels.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        {(needsOpenai || needsGoogle) && (
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Enter your API keys for the selected external providers. Keys are stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsOpenai && (
                <div className="space-y-2">
                  <Label>OpenAI API Key</Label>
                  <div className="relative">
                    <Input
                      type={showOpenai ? "text" : "password"}
                      placeholder="sk-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowOpenai(!showOpenai)}
                    >
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
                    <Input
                      type={showGoogle ? "text" : "password"}
                      placeholder="AIza..."
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowGoogle(!showGoogle)}
                    >
                      {showGoogle ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a></p>
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
