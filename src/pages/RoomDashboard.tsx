import { useRef } from "react";
import { useRoomPersonas } from "@/hooks/useRoomPersonas";
import { useMeetingRooms } from "@/hooks/useMeetingRooms";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Users, MessageSquare, Settings, LogOut, Trash2, Eye, ArrowLeft, Download, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

export default function RoomDashboard() {
  const { data: personas, isLoading: personasLoading, importPersona, deletePersona } = useRoomPersonas();
  const { data: rooms, isLoading: roomsLoading, cloneRoom, deleteRoom } = useMeetingRooms();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomImportRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        importPersona.mutate(data);
      } catch {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportRoomConfig = (room: any) => {
    const config = {
      type: "meeting_room_config",
      name: room.name,
      scenario: room.scenario,
      purpose: room.purpose,
      user_role: room.user_role,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `room-${room.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Room config exported" });
  };

  const handleRoomImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.type !== "meeting_room_config" || !data.name) {
          toast({ title: "Invalid room config file", variant: "destructive" });
          return;
        }
        navigate("/rooms/create", { state: { importedConfig: data } });
      } catch {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const getName = (p: any) => {
    const id = p.identity as any;
    return id?.firstName && id?.lastName ? `${id.firstName} ${id.lastName}` : "Unnamed";
  };

  const pendingRooms = rooms?.filter(r => r.status === "pending") || [];
  const activeRooms = rooms?.filter(r => r.status === "active" || r.status === "paused") || [];
  const pastRooms = rooms?.filter(r => r.status === "ended") || [];

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "paused") return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Persona Generator
            </Button>
            <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <img src={logoImg} alt="Logo" className="h-32 w-32 rounded-2xl" />
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Persona Social Room</h1>
            <p className="text-muted-foreground">Import personas and watch them interact in virtual meeting rooms</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{personas?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Personas</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{activeRooms.length}</p>
            <p className="text-sm text-muted-foreground">Active Rooms</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{pastRooms.length}</p>
            <p className="text-sm text-muted-foreground">Past Meetings</p>
          </CardContent></Card>
        </div>

        {/* Personas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Imported Personas</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => roomImportRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Import Room
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Import Persona
              </Button>
              <Button onClick={() => navigate("/rooms/create")} className="gap-2">
                <Plus className="h-4 w-4" /> Create Room
              </Button>
              <input ref={roomImportRef} type="file" accept=".json" className="hidden" onChange={handleRoomImport} />
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          </div>

          {personasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32" /></Card>)}
            </div>
          ) : !personas?.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold">No personas imported yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Import persona JSON files exported from Persona Maker</p>
                <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>Import Persona</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {personas.map(p => (
                <Card key={p.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {p.portrait_url ? (
                        <img src={p.portrait_url} alt={getName(p)} className="h-10 w-10 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">👤</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{getName(p)}</p>
                        <p className="text-xs text-muted-foreground truncate">{(p.identity as any)?.occupation || "—"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => navigate(`/rooms/persona/${p.id}`)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePersona.mutate(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Pending Rooms */}
        {pendingRooms.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Pending Rooms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRooms.map(r => (
                <Card key={r.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => navigate(`/rooms/meeting/${r.id}`)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <Badge variant="secondary">pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.scenario}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">{r.user_role}</Badge>
                      <div className="flex">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); exportRoomConfig(r); }} className="gap-1 text-xs">
                          <Download className="h-3 w-3" /> Export
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive gap-1 text-xs" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this room?")) deleteRoom.mutate(r.id); }}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Active Rooms */}
        {activeRooms.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Active Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRooms.map(r => (
                <Card key={r.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => navigate(`/rooms/meeting/${r.id}`)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <Badge variant={statusColor(r.status)}>{r.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.scenario}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="outline" className="text-xs">{r.user_role}</Badge>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); cloneRoom.mutate(r); }} className="gap-1 text-xs">
                        <Copy className="h-3 w-3" /> Clone
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); exportRoomConfig(r); }} className="gap-1 text-xs">
                        <Download className="h-3 w-3" /> Export
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive gap-1 text-xs" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this room?")) deleteRoom.mutate(r.id); }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Past Rooms */}
        {pastRooms.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">Meeting History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastRooms.map(r => (
                <Card key={r.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => navigate(`/rooms/meeting/${r.id}`)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{r.name}</CardTitle>
                      <Badge variant="outline">ended</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.scenario}</p>
                    <div className="flex justify-end mt-2">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); cloneRoom.mutate(r); }} className="gap-1 text-xs">
                        <Copy className="h-3 w-3" /> Clone
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); exportRoomConfig(r); }} className="gap-1 text-xs">
                        <Download className="h-3 w-3" /> Export
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive gap-1 text-xs" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this room?")) deleteRoom.mutate(r.id); }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
