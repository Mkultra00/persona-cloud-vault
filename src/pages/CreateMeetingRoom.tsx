import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRoomPersonas } from "@/hooks/useRoomPersonas";
import { usePersonas } from "@/hooks/usePersonas";
import { useMeetingRooms } from "@/hooks/useMeetingRooms";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function CreateMeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: roomPersonas, isLoading: roomLoading } = useRoomPersonas();
  const { data: mainPersonas, isLoading: mainLoading } = usePersonas();
  const { createRoom } = useMeetingRooms();
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("");
  const [purpose, setPurpose] = useState("");
  const [userRole, setUserRole] = useState("observer");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedMainIds, setSelectedMainIds] = useState<string[]>([]);

  useEffect(() => {
    const state = location.state as any;
    const config = state?.importedConfig || state?.cloneConfig;
    if (config) {
      setName(config.name || "");
      setScenario(config.scenario || "");
      setPurpose(config.purpose || "");
      setUserRole(config.user_role || "observer");
      if (config.duration_minutes) setDurationMinutes(config.duration_minutes);
      if (config.persona_ids?.length) setSelectedRoomIds(config.persona_ids);
      toast({ title: state?.cloneConfig ? "Room cloned — edit details and create" : "Room config imported — select participants to continue" });
    }
  }, [location.state]);

  const toggleRoom = (id: string) => {
    setSelectedRoomIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleMain = (id: string) => {
    setSelectedMainIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getName = (p: any) => {
    const id = p.identity as any;
    return id?.firstName && id?.lastName ? `${id.firstName} ${id.lastName}` : "Unnamed";
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: "Room name required", variant: "destructive" }); return; }
    const totalSelected = selectedRoomIds.length + selectedMainIds.length;
    if (totalSelected < 2) { toast({ title: "Select at least 2 personas", variant: "destructive" }); return; }

    // Auto-import selected main personas into room_personas
    const importedIds: string[] = [];
    for (const pid of selectedMainIds) {
      const mp = mainPersonas?.find(p => p.id === pid);
      if (!mp) continue;
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.from("room_personas").insert({
        identity: mp.identity || {},
        psychology: mp.psychology || {},
        backstory: mp.backstory || {},
        memory: mp.memory || {},
        portrait_url: mp.portrait_url,
        created_by: user?.id,
      } as any).select("id").single();
      if (!error && data) importedIds.push(data.id);
    }

    const allIds = [...selectedRoomIds, ...importedIds];
    const room = await createRoom.mutateAsync({
      name, scenario, purpose, user_role: userRole, duration_minutes: durationMinutes, persona_ids: allIds,
    });
    navigate(`/rooms/meeting/${room.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rooms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create Meeting Room</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Room Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Room Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Product Design Review" />
            </div>
            <div>
              <Label htmlFor="scenario">Scenario</Label>
              <Textarea id="scenario" value={scenario} onChange={e => setScenario(e.target.value)}
                placeholder="Describe the situational context..." rows={3} />
            </div>
            <div>
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)}
                placeholder="What's the goal of this meeting?" rows={2} />
            </div>
            <div>
              <Label>Your Role</Label>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="observer">Observer — Watch only, see inner thoughts</SelectItem>
                  <SelectItem value="moderator">Moderator — Control the flow</SelectItem>
                  <SelectItem value="facilitator">Facilitator — Participate in conversation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Meeting Duration (minutes)</Label>
              <Select value={String(durationMinutes)} onValueChange={v => setDurationMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Select Personas (min 2)</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Room Personas */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                Social Room Personas
                <Badge variant="secondary" className="text-xs">{roomPersonas?.length || 0}</Badge>
              </h3>
              {roomLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : !roomPersonas?.length ? (
                <p className="text-muted-foreground text-sm">No room personas imported yet.</p>
              ) : (
                <div className="space-y-2">
                  {roomPersonas.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                      <Checkbox checked={selectedRoomIds.includes(p.id)} onCheckedChange={() => toggleRoom(p.id)} />
                      {p.portrait_url ? (
                        <img src={p.portrait_url} alt={getName(p)} className="h-8 w-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">👤</div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{getName(p)}</p>
                        <p className="text-xs text-muted-foreground">{(p.identity as any)?.occupation || "—"}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Main Generator Personas */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                Persona Generator
                <Badge variant="outline" className="text-xs">{mainPersonas?.length || 0}</Badge>
              </h3>
              {mainLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : !mainPersonas?.length ? (
                <p className="text-muted-foreground text-sm">No personas created yet.</p>
              ) : (
                <div className="space-y-2">
                  {mainPersonas.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                      <Checkbox checked={selectedMainIds.includes(p.id)} onCheckedChange={() => toggleMain(p.id)} />
                      {p.portrait_url ? (
                        <img src={p.portrait_url} alt={getName(p)} className="h-8 w-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">👤</div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{getName(p)}</p>
                        <p className="text-xs text-muted-foreground">{(p.identity as any)?.occupation || "—"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Generator</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/rooms")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createRoom.isPending}>
            {createRoom.isPending ? "Creating..." : "Create & Start Meeting"}
          </Button>
        </div>
      </main>
    </div>
  );
}
