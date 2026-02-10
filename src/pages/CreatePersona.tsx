import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Loader2, Dices, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import pandaVideo from "@/assets/panda-making-doll-loop.mp4";

interface KnowledgeFile {
  file: File;
  name: string;
  type: "image" | "document";
  preview?: string;
  textContent?: string;
}

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
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const randomScenarios = [
    { scenario: "A frustrated elderly customer trying to return a product they bought online but don't understand the return process.", purpose: "Test patience and clarity in customer support interactions." },
    { scenario: "A teenager applying for their first part-time job at a fast food restaurant.", purpose: "Evaluate how hiring interfaces handle inexperienced applicants." },
    { scenario: "A busy single parent trying to book a last-minute pediatric appointment through a health app.", purpose: "Identify UX friction for time-pressed users with urgent needs." },
    { scenario: "A skeptical investor evaluating a new cryptocurrency trading platform.", purpose: "Test trust signals and risk communication in fintech products." },
    { scenario: "A non-native English speaker trying to navigate a government benefits website.", purpose: "Assess accessibility and language barriers in civic tech." },
    { scenario: "A small business owner setting up their first e-commerce store.", purpose: "Evaluate onboarding complexity for non-technical entrepreneurs." },
    { scenario: "A college student comparing student loan refinancing options.", purpose: "Test financial literacy assumptions in lending products." },
    { scenario: "A retiree learning to use video calling to stay in touch with grandchildren.", purpose: "Evaluate tech onboarding for low-digital-literacy users." },
    { scenario: "A freelance graphic designer negotiating project scope with a difficult client.", purpose: "Test conflict resolution and communication tools." },
    { scenario: "A fitness enthusiast tracking macros and workouts across multiple apps.", purpose: "Evaluate data integration and habit-tracking UX." },
    { scenario: "A refugee family navigating a housing assistance application.", purpose: "Test empathy and cultural sensitivity in social services." },
    { scenario: "A visually impaired user trying to order groceries through a delivery app.", purpose: "Assess screen reader compatibility and accessibility." },
  ];

  const handleFilesAdded = useCallback(async (files: FileList | File[]) => {
    const newFiles: KnowledgeFile[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isDoc = file.type === "application/pdf" || file.type.includes("text") || file.type.includes("json") ||
        file.type.includes("markdown") || file.name.endsWith(".md") || file.name.endsWith(".txt") || file.name.endsWith(".csv");

      if (!isImage && !isDoc) {
        toast({ title: `Unsupported file: ${file.name}`, description: "Use images, PDFs, or text files.", variant: "destructive" });
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: `File too large: ${file.name}`, description: "Max 20MB per file.", variant: "destructive" });
        continue;
      }

      const kf: KnowledgeFile = { file, name: file.name, type: isImage ? "image" : "document" };

      if (isImage) {
        kf.preview = URL.createObjectURL(file);
      } else {
        // Read text content client-side
        kf.textContent = await file.text();
      }
      newFiles.push(kf);
    }
    setKnowledgeFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (idx: number) => {
    setKnowledgeFiles((prev) => {
      const removed = prev[idx];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFilesAdded(e.dataTransfer.files);
  }, [handleFilesAdded]);

  const handleRollDice = () => {
    const random = randomScenarios[Math.floor(Math.random() * randomScenarios.length)];
    const randomVariance = Math.floor(Math.random() * 10) + 1;
    const randomCount = Math.floor(Math.random() * 3) + 1;
    setScenario(random.scenario);
    setPurpose(random.purpose);
    setVariance([randomVariance]);
    setCount(randomCount);
    doGenerate(random.scenario, random.purpose, randomVariance, randomCount);
  };

  const handleGenerate = () => {
    if (!scenario.trim() || !purpose.trim()) {
      toast({ title: "Please fill in both fields", variant: "destructive" });
      return;
    }
    doGenerate(scenario, purpose, variance[0], count);
  };

  const uploadFilesToStorage = async (files: KnowledgeFile[]) => {
    const uploaded: { type: string; name: string; url?: string; textContent?: string }[] = [];
    for (const kf of files) {
      if (kf.type === "image") {
        const ext = kf.file.name.split(".").pop() || "png";
        const path = `knowledge/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("chat-attachments").upload(path, kf.file, { contentType: kf.file.type });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
          uploaded.push({ type: "image", name: kf.name, url: publicUrl });
        }
      } else {
        uploaded.push({ type: "document", name: kf.name, textContent: kf.textContent });
      }
    }
    return uploaded;
  };

  const doGenerate = async (s: string, p: string, v: number, c: number) => {
    setLoading(true);
    try {
      let knowledgeAttachments: any[] = [];
      if (knowledgeFiles.length > 0) {
        knowledgeAttachments = await uploadFilesToStorage(knowledgeFiles);
      }
      const { data, error } = await supabase.functions.invoke("generate-persona", {
        body: { scenario: s, purpose: p, varianceLevel: v, count: c, knowledgeAttachments },
      });
      if (error) throw error;
      toast({ title: `${c} persona${c > 1 ? "s" : ""} created! 🎉` });
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

            <div className="space-y-3">
              <Label>Knowledge Attachments</Label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.csv,.json"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                />
                <Paperclip className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop files or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, PDFs, text files — used as context for persona generation
                </p>
              </div>

              {knowledgeFiles.length > 0 && (
                <div className="space-y-2">
                  {knowledgeFiles.map((kf, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2">
                      {kf.type === "image" && kf.preview ? (
                        <img src={kf.preview} alt={kf.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{kf.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kf.type === "image" ? "Image" : "Document"} · {(kf.file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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

            <div className="flex gap-3">
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 gap-2" size="lg">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating..." : `Generate ${count} Persona${count > 1 ? "s" : ""}`}
              </Button>
              <Button onClick={handleRollDice} disabled={loading} variant="secondary" className="gap-2" size="lg">
                <Dices className="h-4 w-4" /> Roll the Dice 🎲
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-card p-10 shadow-2xl border border-border animate-scale-in min-w-[340px]">
             <video
               src={pandaVideo}
               autoPlay
               loop
               muted
               playsInline
               className="h-40 w-40 object-contain rounded-xl"
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
