import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { AI_MODELS } from "@/lib/types";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading, upsert } = useSettings();
  const [provider, setProvider] = useState("lovable");
  const [model, setModel] = useState("google/gemini-3-flash-preview");

  useEffect(() => {
    if (settings) {
      setProvider(settings.ai_provider);
      setModel(settings.ai_model);
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate({ ai_provider: provider, ai_model: model });
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
        <Card>
          <CardHeader>
            <CardTitle>AI Provider Configuration</CardTitle>
            <CardDescription>
              Choose which AI model powers persona generation and conversations. Lovable AI is the default — no API key needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">Lovable AI (Built-in, no API key needed)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Lovable AI provides access to Google Gemini and OpenAI models with no configuration required.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Faster models cost less but may produce simpler personas. Pro models generate richer detail.
              </p>
            </div>

            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {upsert.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
