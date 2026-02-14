import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMeetingRoom } from "@/hooks/useMeetingRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Play, Pause, Square, Send, Brain, UserMinus, Loader2, SkipForward } from "lucide-react";
import type { RoomPersona } from "@/lib/roomTypes";

export default function MeetingRoomView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    room, roomLoading, participants, messages, isGenerating,
    startMeeting, pauseMeeting, resumeMeeting, endMeeting,
    generateNextTurn, sendDirective, sendFacilitatorMessage, removePersona,
  } = useMeetingRoom(roomId!);

  const [input, setInput] = useState("");
  const [showThoughts, setShowThoughts] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (roomLoading || !room) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  const getPersona = (personaId: string | null): RoomPersona | undefined =>
    participants.find(p => p.id === personaId);

  const getPersonaName = (personaId: string | null) => {
    if (!personaId) return "System";
    const p = getPersona(personaId);
    if (!p) return "Unknown";
    const id = p.identity as any;
    return `${id?.firstName || ""} ${id?.lastName || ""}`.trim() || "Unknown";
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    setInput("");
    if (room.user_role === "facilitator") {
      await sendFacilitatorMessage(msg);
    } else if (room.user_role === "moderator") {
      await sendDirective(msg);
    }
  };

  const roleColor = (role: string) => {
    if (role === "system") return "bg-muted text-muted-foreground";
    if (role === "moderator") return "bg-warning/10 text-warning-foreground border-warning/30";
    if (role === "facilitator") return "bg-accent/10 text-accent-foreground border-accent/30";
    return "bg-card border-border";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/rooms")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">{room.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={room.status === "active" ? "default" : room.status === "paused" ? "secondary" : "outline"}>
                  {room.status}
                </Badge>
                <span>Role: {room.user_role}</span>
                <span>• {participants.length} participants</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {room.status === "pending" && (
              <Button size="sm" onClick={startMeeting} className="gap-1">
                <Play className="h-3 w-3" /> Start Meeting
              </Button>
            )}
            {room.status === "active" && (
              <>
                {(room.user_role === "moderator") && (
                  <Button size="sm" variant="outline" onClick={pauseMeeting} className="gap-1">
                    <Pause className="h-3 w-3" /> Pause
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => generateNextTurn()} disabled={isGenerating} className="gap-1">
                  <SkipForward className="h-3 w-3" /> Next Turn
                </Button>
                {(room.user_role === "moderator") && (
                  <Button size="sm" variant="destructive" onClick={endMeeting} className="gap-1">
                    <Square className="h-3 w-3" /> End
                  </Button>
                )}
              </>
            )}
            {room.status === "paused" && room.user_role === "moderator" && (
              <>
                <Button size="sm" onClick={resumeMeeting} className="gap-1">
                  <Play className="h-3 w-3" /> Resume
                </Button>
                <Button size="sm" variant="destructive" onClick={endMeeting} className="gap-1">
                  <Square className="h-3 w-3" /> End
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowThoughts(!showThoughts)} className="gap-1">
              <Brain className="h-3 w-3" /> {showThoughts ? "Hide" : "Show"} Thoughts
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Participants */}
        <aside className="w-56 border-r border-border bg-card/30 p-4 hidden md:block overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Participants</h3>
          <div className="space-y-3">
            {participants.map(p => {
              const id = p.identity as any;
              const name = `${id?.firstName || ""} ${id?.lastName || ""}`.trim() || "Unknown";
              return (
                <div key={p.id} className="flex items-center gap-2">
                  {p.portrait_url ? (
                    <img src={p.portrait_url} alt={name} className="h-8 w-8 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">👤</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{id?.occupation || "—"}</p>
                  </div>
                  {room.user_role === "moderator" && room.status !== "ended" && (
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removePersona(p.id)}>
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`rounded-lg border p-3 ${roleColor(msg.role)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === "persona" && msg.persona_id && (
                      <>
                        {getPersona(msg.persona_id)?.portrait_url ? (
                          <img src={getPersona(msg.persona_id)!.portrait_url!} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">👤</div>
                        )}
                      </>
                    )}
                    <span className="text-xs font-semibold">
                      {msg.role === "persona" ? getPersonaName(msg.persona_id) :
                       msg.role === "system" ? "📢 System" :
                       msg.role === "moderator" ? "🎯 Moderator" :
                       "💬 Facilitator"}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {showThoughts && msg.inner_thought && (
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="text-xs text-muted-foreground mt-2 flex items-center gap-1 hover:text-foreground transition-colors">
                        <Brain className="h-3 w-3" /> Inner thought
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="text-xs text-muted-foreground italic mt-1 pl-4 border-l-2 border-muted">
                          {msg.inner_thought}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>A persona is thinking...</span>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </div>

          {/* Input (for moderator/facilitator) */}
          {room.status !== "ended" && room.user_role !== "observer" && (
            <div className="border-t border-border bg-card/50 p-4">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={room.user_role === "facilitator" ? "Send a message as facilitator..." : "Send a directive..."}
                  disabled={isGenerating}
                />
                <Button onClick={handleSend} disabled={isGenerating || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
