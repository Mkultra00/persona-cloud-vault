import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Eye, EyeOff, Brain } from "lucide-react";
import type { Persona, Message } from "@/lib/types";

export default function Chat() {
  const { personaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThought, setStreamingThought] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: persona } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("personas").select("*").eq("id", personaId!).maybeSingle();
      if (error) throw error;
      return data as unknown as Persona;
    },
    enabled: !!personaId,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Message[];
    },
    enabled: !!conversationId,
  });

  // Create or get conversation on mount
  useEffect(() => {
    if (!personaId) return;
    const init = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      // Find existing active conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("persona_id", personaId)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
      } else {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ persona_id: personaId, user_id: user?.id })
          .select("id")
          .single();
        if (!error && data) setConversationId(data.id);
      }
    };
    init();
  }, [personaId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || !personaId) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setStreamingContent("");
    setStreamingThought("");

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userMessage,
    });
    await refetchMessages();

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-persona`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          personaId,
          conversationId,
          message: userMessage,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullThought = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            const thought = parsed.inner_thought;
            if (content) {
              fullContent += content;
              setStreamingContent(fullContent);
            }
            if (thought) {
              fullThought += thought;
              setStreamingThought(fullThought);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save persona message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "persona",
        content: fullContent,
        inner_thought: fullThought || null,
      });

      setStreamingContent("");
      setStreamingThought("");
      await refetchMessages();
    } catch (e: any) {
      console.error("Chat error:", e);
    } finally {
      setSending(false);
    }
  };

  const identity = persona?.identity as any;
  const personaName = identity?.firstName ? `${identity.firstName} ${identity.lastName}` : "Persona";

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{personaName}</h1>
              <p className="text-xs text-muted-foreground">{identity?.occupation}</p>
            </div>
          </div>
          <Button
            variant={showThoughts ? "default" : "outline"}
            size="sm"
            onClick={() => setShowThoughts(!showThoughts)}
            className="gap-1"
          >
            <Brain className="h-3 w-3" />
            {showThoughts ? "Hide" : "Show"} Thoughts
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="container mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}>
                  {msg.content}
                </div>
              </div>
              {showThoughts && msg.role === "persona" && msg.inner_thought && (
                <div className="flex justify-start mt-1 ml-2">
                  <div className="max-w-[75%] rounded-lg px-3 py-2 text-xs bg-muted/50 border border-border/50 italic text-muted-foreground">
                    💭 {msg.inner_thought}
                  </div>
                </div>
              )}
            </div>
          ))}

          {streamingContent && (
            <div>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-card border border-border">
                  {streamingContent}
                  <span className="animate-pulse-soft">▊</span>
                </div>
              </div>
              {showThoughts && streamingThought && (
                <div className="flex justify-start mt-1 ml-2">
                  <div className="max-w-[75%] rounded-lg px-3 py-2 text-xs bg-muted/50 border border-border/50 italic text-muted-foreground">
                    💭 {streamingThought}
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card/50 backdrop-blur-sm shrink-0 p-4">
        <div className="container mx-auto max-w-3xl flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${personaName}...`}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
