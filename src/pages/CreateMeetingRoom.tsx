import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomPersonas } from "@/hooks/useRoomPersonas";
import { useMeetingRooms } from "@/hooks/useMeetingRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function CreateMeetingRoom() {
  const navigate = useNavigate();
  const { data: personas, isLoading } = useRoomPersonas();
  const { createRoom } = useMeetingRooms();
  const [name, setName] = useState("");
  const [scenario, setScenario] = useState("");
  const [purpose, setPurpose] = useState("");
  const [userRole, setUserRole] = useState("observer");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const togglePersona = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getName = (p: any) => {
    const id = p.identity as any;
    return id?.firstName && id?.lastName ? `${id.firstName} ${id.lastName}` : "Unnamed";
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: "Room name required", variant: "destructive" }); return; }
    if (selectedIds.length < 2) { toast({ title: "Select at least 2 personas", variant: "destructive" }); return; }
    
    const room = await createRoom.mutateAsync({
      name, scenario, purpose, user_role: userRole, persona_ids: selectedIds,
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Select Personas (min 2)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading personas...</p>
            ) : !personas?.length ? (
              <p className="text-muted-foreground">No personas imported yet. Import some from the dashboard first.</p>
            ) : (
              <div className="space-y-3">
                {personas.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                    <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => togglePersona(p.id)} />
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
