import { useState, useRef } from "react";
import { usePersonas } from "@/hooks/usePersonas";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Upload, Settings, LogOut, MessageSquare, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Persona } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

export default function Dashboard() {
  const { data: personas, isLoading, deleteMutation, importPersonas } = usePersonas();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportPersonas = () => {
    if (!personas?.length) return;
    const blob = new Blob([JSON.stringify(personas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Personas exported" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const arr = Array.isArray(data) ? data : [data];
        importPersonas.mutate(arr);
      } catch {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const getPersonaName = (p: Persona) => {
    const id = p.identity as any;
    return id?.firstName && id?.lastName ? `${id.firstName} ${id.lastName}` : "Unnamed Persona";
  };

  const getMoodEmoji = (p: Persona) => {
    const psych = p.psychology as any;
    if (!psych?.trustLevel) return "😐";
    if (psych.trustLevel > 60) return "😊";
    if (psych.trustLevel > 40) return "🤔";
    return "😐";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Personas R Us logo" className="h-14 w-14 rounded-lg" />
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Personas R Us</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Active Personas</h2>
            <p className="text-muted-foreground mt-1">
              {personas?.length ?? 0} persona{personas?.length !== 1 ? "s" : ""} created
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/create")} className="gap-2">
              <Plus className="h-4 w-4" /> Create New
            </Button>
            <Button variant="outline" onClick={exportPersonas} disabled={!personas?.length} className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> Import
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse-soft">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : !personas?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No personas yet</h3>
              <p className="mt-1 text-muted-foreground max-w-sm">
                Create your first persona by describing a testing scenario, or import personas from a JSON file.
              </p>
              <div className="mt-6 flex gap-2">
                <Button onClick={() => navigate("/create")}>Create Persona</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Import JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((p) => (
              <Card key={p.id} className="group hover:border-primary/30 transition-colors relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {p.portrait_url ? (
                        <img src={p.portrait_url} alt={getPersonaName(p)} className="h-10 w-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                          {getMoodEmoji(p)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{getPersonaName(p)}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {(p.identity as any)?.occupation || "No occupation"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {p.generation_prompt || "No scenario description"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Trust: {(p.psychology as any)?.trustLevel ?? "—"}/100</span>
                    <span>{p.total_interactions} sessions</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => navigate(`/persona/${p.id}`)}
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => navigate(`/chat/${p.id}`)}
                    >
                      <MessageSquare className="h-3 w-3" /> Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
