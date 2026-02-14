import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Eye, EyeOff, Download, ImagePlus, Loader2, Copy } from "lucide-react";
import type { Persona } from "@/lib/types";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { downloadFullPersonaExport } from "@/lib/exportPersona";

export default function PersonaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPsych, setShowPsych] = useState(false);
  const [showBackstory, setShowBackstory] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [generatingPortrait, setGeneratingPortrait] = useState(false);
  const queryClient = useQueryClient();

  const handleGeneratePortrait = async () => {
    if (!persona) return;
    setGeneratingPortrait(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-portrait", {
        body: { personaId: persona.id },
      });
      if (error) throw error;
      toast({ title: "Portrait generated!" });
      queryClient.invalidateQueries({ queryKey: ["persona", id] });
    } catch (e: any) {
      toast({ title: "Portrait generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingPortrait(false);
    }
  };

  const { data: persona, isLoading } = useQuery({
    queryKey: ["persona", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("personas").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as Persona;
    },
    enabled: !!id,
  });

  const exportOne = async () => {
    if (!persona) return;
    try {
      await downloadFullPersonaExport(persona);
      toast({ title: "Persona exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!persona) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Persona not found</p></div>;

  const identity = persona.identity as any;
  const psych = persona.psychology as any;
  const backstory = persona.backstory as any;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">{identity?.firstName} {identity?.lastName}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/create", { state: { scenario: persona.generation_prompt, purpose: persona.testing_purpose, variance: persona.variance_level } })} className="gap-1">
              <Copy className="h-3 w-3" /> Clone
            </Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePortrait} disabled={generatingPortrait} className="gap-1">
              {generatingPortrait ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
              {generatingPortrait ? "Generating..." : "Generate Portrait"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportOne} className="gap-1">
              <Download className="h-3 w-3" /> Export
            </Button>
            <Button size="sm" onClick={() => navigate(`/chat/${persona.id}`)} className="gap-1">
              <MessageSquare className="h-3 w-3" /> Chat
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Portrait + Identity Card */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent>
            {persona.portrait_url && (
              <div className="mb-4 flex justify-center">
                <img
                  src={persona.portrait_url}
                  alt={`${identity?.firstName} ${identity?.lastName}`}
                  className="h-40 w-40 rounded-full object-cover border-2 border-border"
                />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Age" value={identity?.age} />
              <Field label="Gender" value={identity?.gender} />
              <Field label="Location" value={`${identity?.city}, ${identity?.state}`} />
              <Field label="Occupation" value={identity?.occupation} />
              <Field label="Education" value={identity?.educationLevel} />
              <Field label="Tech Savviness" value={identity?.techSavviness} />
              <Field label="Marital Status" value={identity?.maritalStatus} />
              <Field label="Income" value={identity?.incomeRange} />
              <Field label="Hobbies" value={identity?.hobbies?.join(", ")} />
            </div>
          </CardContent>
        </Card>

        {/* Psychology - Hidden by default */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowPsych(!showPsych)}>
            <CardTitle className="flex items-center justify-between">
              <span>👁 Personality & Psychology</span>
              {showPsych ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showPsych && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <TraitBar label="Openness" value={psych?.openness} />
                <TraitBar label="Conscientiousness" value={psych?.conscientiousness} />
                <TraitBar label="Extraversion" value={psych?.extraversion} />
                <TraitBar label="Agreeableness" value={psych?.agreeableness} />
                <TraitBar label="Neuroticism" value={psych?.neuroticism} />
                <TraitBar label="Trust" value={psych?.trustLevel} />
                <TraitBar label="Patience" value={psych?.patience} />
                <TraitBar label="Proactivity" value={psych?.proactivityLevel} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field label="Communication" value={psych?.communicationStyle} />
                <Field label="Decision Making" value={psych?.decisionMakingStyle} />
                <Field label="Conflict Style" value={psych?.conflictStyle} />
                <Field label="Primary Motivation" value={psych?.primaryMotivation} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Backstory */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowBackstory(!showBackstory)}>
            <CardTitle className="flex items-center justify-between">
              <span>👁 Backstory</span>
              {showBackstory ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showBackstory && (
            <CardContent className="space-y-6 text-sm">
              <p className="text-foreground whitespace-pre-wrap">{backstory?.lifeNarrative}</p>
              <Field label="Current Situation" value={backstory?.currentLifeSituation} />

              {/* Education History */}
              {backstory?.educationHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🎓 Education History</p>
                  <div className="space-y-3">
                    {backstory.educationHistory.map((edu: any, i: number) => (
                      <div key={i} className="border border-border rounded-lg p-3 bg-muted/30">
                        <p className="font-medium text-foreground">{edu.degree} in {edu.fieldOfStudy}</p>
                        <p className="text-muted-foreground">{edu.institution}</p>
                        <p className="text-xs text-muted-foreground">{edu.yearStarted} – {edu.yearEnded ?? "Present"}</p>
                        {edu.highlights?.length > 0 && (
                          <ul className="mt-1 list-disc list-inside text-xs text-muted-foreground">
                            {edu.highlights.map((h: string, j: number) => <li key={j}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Occupation History */}
              {backstory?.occupationHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">💼 Occupation History</p>
                  <div className="space-y-3">
                    {backstory.occupationHistory.map((job: any, i: number) => (
                      <div key={i} className="border border-border rounded-lg p-3 bg-muted/30">
                        <p className="font-medium text-foreground">{job.title}</p>
                        <p className="text-muted-foreground">{job.employer}</p>
                        <p className="text-xs text-muted-foreground">{job.yearStarted} – {job.yearEnded ?? "Present"}</p>
                        {job.description && <p className="mt-1 text-xs text-muted-foreground">{job.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Agenda */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowAgenda(!showAgenda)}>
            <CardTitle className="flex items-center justify-between">
              <span>👁 Hidden Agenda & Biases</span>
              {showAgenda ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showAgenda && (
            <CardContent className="space-y-3 text-sm">
              <Field label="Hidden Agenda" value={psych?.hiddenAgenda} />
              <Field label="🤫 Deep Secrets" value={psych?.deepSecrets?.join("; ")} />
              <Field label="😳 Embarrassing Moments" value={psych?.embarrassingMoments?.join("; ")} />
              <Field label="Mental Health Challenges" value={psych?.mentalHealthChallenges?.join(", ")} />
              <Field label="Physical Health Challenges" value={psych?.physicalHealthChallenges?.join(", ")} />
              <Field label="Internal Biases" value={psych?.internalBiases?.join(", ")} />
              <Field label="Fears" value={psych?.fears?.join(", ")} />
              <Field label="Frustrations" value={psych?.frustrations?.join(", ")} />
            </CardContent>
          )}
        </Card>

        {/* Scenario */}
        <Card>
          <CardHeader><CardTitle>Generation Context</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Scenario" value={persona.generation_prompt} />
            <Field label="Purpose" value={persona.testing_purpose} />
            <Field label="Variance" value={`${persona.variance_level}/10`} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function TraitBar({ label, value }: { label: string; value?: number }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{v}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
