import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function CreatePersona() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState("");
  const [purpose, setPurpose] = useState("");
  const [variance, setVariance] = useState([5]);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const varianceLabels = ["", "Archetypal", "Archetypal", "Realistic", "Realistic", "Interesting", "Interesting", "Edge Case", "Edge Case", "Wild Card", "Wild Card"];

  const handleGenerate = async () => {
    if (!scenario.trim() || !purpose.trim()) {
      toast({ title: "Please fill in both fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-persona", {
        body: { scenario, purpose, varianceLevel: variance[0], count },
      });
      if (error) throw error;
      toast({ title: `${count} persona${count > 1 ? "s" : ""} generated!` });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Create Persona</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Define Your Testing Scenario
            </CardTitle>
            <CardDescription>
              Describe the scenario and purpose. The AI will generate a complete, realistic persona.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="scenario">Scenario Description *</Label>
              <Textarea
                id="scenario"
                placeholder="e.g., We're testing a new budgeting app aimed at young professionals. We want to understand how a skeptical first-time user would react to the onboarding flow."
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Testing Purpose *</Label>
              <Textarea
                id="purpose"
                placeholder="e.g., Identify friction points in onboarding for users who distrust fintech apps."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variance Level</Label>
                <Badge variant="secondary">{variance[0]} — {varianceLabels[variance[0]]}</Badge>
              </div>
              <Slider
                value={variance}
                onValueChange={setVariance}
                min={1}
                max={10}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Low = archetypal match. High = edge cases & surprises.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Persona Count</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Generating..." : `Generate ${count} Persona${count > 1 ? "s" : ""}`}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      variant === "secondary" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
    }`}>
      {children}
    </span>
  );
}
