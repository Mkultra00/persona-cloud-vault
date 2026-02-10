import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import pandaDollImg from "@/assets/panda-making-doll.png";

export default function CreatePersona() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state as { scenario?: string; purpose?: string; variance?: number } | null;

  const [scenario, setScenario] = useState(prefill?.scenario || "");
  const [purpose, setPurpose] = useState(prefill?.purpose || "");
  const [variance, setVariance] = useState([prefill?.variance ?? 5]);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [buildStep, setBuildStep] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildSteps = [
    { emoji: "🧬", text: "Assembling identity..." },
    { emoji: "🧠", text: "Adding personality..." },
    { emoji: "📖", text: "Writing backstory..." },
    { emoji: "🎭", text: "Applying quirks & biases..." },
    { emoji: "🖼️", text: "Painting portrait..." },
    { emoji: "✨", text: "Final touches..." },
  ];

  useEffect(() => {
    if (loading) {
      setBuildStep(0);
      stepTimerRef.current = setInterval(() => {
        setBuildStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 5000);
    } else {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, [loading]);

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
      toast({ title: `${count} persona${count > 1 ? "s" : ""} created! 🎉` });
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

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-card p-10 shadow-2xl border border-border animate-scale-in min-w-[340px]">
            <img
              src={pandaDollImg}
              alt="Panda assembling a persona"
              className="h-40 w-40 object-contain animate-bounce"
            />
            <p className="text-lg font-bold text-foreground">Building your persona{count > 1 ? "s" : ""}...</p>

            <div className="w-full space-y-2">
              {buildSteps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                    i < buildStep ? "text-muted-foreground line-through opacity-60" :
                    i === buildStep ? "text-foreground font-semibold" :
                    "text-muted-foreground/40"
                  }`}
                >
                  <span className={`text-base ${i === buildStep ? "animate-bounce" : ""}`}>{step.emoji}</span>
                  <span>{step.text}</span>
                  {i < buildStep && <span className="ml-auto text-xs text-primary">✓</span>}
                  {i === buildStep && <Loader2 className="ml-auto h-3 w-3 animate-spin text-primary" />}
                </div>
              ))}
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${((buildStep + 1) / buildSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
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
