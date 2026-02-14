import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { RoomPersona } from "@/lib/roomTypes";

export default function RoomPersonaDetail() {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();

  const { data: persona, isLoading } = useQuery({
    queryKey: ["room_persona", personaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_personas").select("*").eq("id", personaId!).single();
      if (error) throw error;
      return data as unknown as RoomPersona;
    },
  });

  if (isLoading || !persona) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  const identity = persona.identity as any;
  const psychology = persona.psychology as any;
  const backstory = persona.backstory as any;
  const name = `${identity?.firstName || ""} ${identity?.lastName || ""}`.trim() || "Unknown";

  const traitBar = (label: string, value: number) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-32">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {persona.portrait_url && (
                <img src={persona.portrait_url} alt={name} className="h-24 w-24 rounded-xl object-cover border border-border" />
              )}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Age:</span> {identity?.age}</div>
                <div><span className="text-muted-foreground">Gender:</span> {identity?.gender}</div>
                <div><span className="text-muted-foreground">Occupation:</span> {identity?.occupation}</div>
                <div><span className="text-muted-foreground">Location:</span> {identity?.city}, {identity?.country}</div>
                <div><span className="text-muted-foreground">Education:</span> {identity?.educationLevel}</div>
                <div><span className="text-muted-foreground">Marital:</span> {identity?.maritalStatus}</div>
              </div>
            </div>
            {identity?.hobbies?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {identity.hobbies.map((h: string) => <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Psychology */}
        <Card>
          <CardHeader><CardTitle>Psychology</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {traitBar("Openness", psychology?.openness ?? 50)}
            {traitBar("Conscientiousness", psychology?.conscientiousness ?? 50)}
            {traitBar("Extraversion", psychology?.extraversion ?? 50)}
            {traitBar("Agreeableness", psychology?.agreeableness ?? 50)}
            {traitBar("Neuroticism", psychology?.neuroticism ?? 50)}
            {traitBar("Trust Level", psychology?.trustLevel ?? 50)}
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Communication:</span> {psychology?.communicationStyle}</div>
              <div><span className="text-muted-foreground">Motivation:</span> {psychology?.primaryMotivation}</div>
            </div>
          </CardContent>
        </Card>

        {/* Backstory */}
        <Card>
          <CardHeader><CardTitle>Backstory</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {backstory?.lifeNarrative && <p className="whitespace-pre-wrap">{backstory.lifeNarrative}</p>}
            {backstory?.currentLifeSituation && (
              <div><span className="font-medium">Current situation:</span> {backstory.currentLifeSituation}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
