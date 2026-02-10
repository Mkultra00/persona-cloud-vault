import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Eye, EyeOff, Brain, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Persona, Message } from "@/lib/types";

interface Attachment {
  file: File;
  type: "image" | "document";
  preview?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const DOC_EXTENSIONS = [".docx", ".txt", ".md", ".rtf", ".pdf", ".json"];

function getFileCategory(file: File): "image" | "document" | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (DOC_EXTENSIONS.includes(ext)) return "document";
  return null;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!personaId) return;
    const init = async () => {
      const user = (await supabase.auth.getUser()).data.user;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      const category = getFileCategory(file);
      if (!category) {
        toast({ title: "Unsupported file type", description: `${file.name} is not supported.`, variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit.`, variant: "destructive" });
        continue;
      }
      const att: Attachment = { file, type: category };
      if (category === "image") {
        att.preview = URL.createObjectURL(file);
      }
      newAttachments.push(att);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || !conversationId || !personaId) return;
    const userMessage = input.trim();
    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    setSending(true);
    setStreamingContent("");
    setStreamingThought("");

    // Build attachment descriptions for the stored message
    const attachmentNames = currentAttachments.map((a) => a.file.name).join(", ");
    const storedContent = attachmentNames
      ? `${userMessage}\n\n[Attachments: ${attachmentNames}]`
      : userMessage;

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: storedContent,
    });
    await refetchMessages();

    try {
      // Process attachments for the API
      const processedAttachments: any[] = [];
      for (const att of currentAttachments) {
        if (att.type === "image") {
          // Upload image to storage and get public URL
          const ext = att.file.name.split(".").pop();
          const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("chat-attachments")
            .upload(path, att.file, { contentType: att.file.type });
          if (uploadErr) {
            console.error("Upload error:", uploadErr);
            continue;
          }
          const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
          processedAttachments.push({ type: "image", url: publicUrl, name: att.file.name });
        } else {
          // Read document as text
          try {
            const textContent = await readFileAsText(att.file);
            processedAttachments.push({
              type: "document",
              name: att.file.name,
              textContent: textContent.slice(0, 50000), // Limit to 50k chars
            });
          } catch {
            toast({ title: "Could not read file", description: att.file.name, variant: "destructive" });
          }
        }
      }

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
          attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
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
      toast({ title: "Chat error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
      // Clean up previews
      currentAttachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
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
                  <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs bg-muted/50 border border-border/50 italic text-muted-foreground whitespace-pre-wrap break-words">
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
                  <div className="max-w-[85%] rounded-lg px-3 py-2 text-xs bg-muted/50 border border-border/50 italic text-muted-foreground whitespace-pre-wrap break-words">
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
        <div className="container mx-auto max-w-3xl">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((att, i) => (
                <div key={i} className="relative group flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
                  {att.type === "image" && att.preview ? (
                    <img src={att.preview} alt={att.file.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="max-w-[120px] truncate text-foreground">{att.file.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.docx,.txt,.md,.rtf,.pdf,.json"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
            <Button onClick={handleSend} disabled={sending || (!input.trim() && attachments.length === 0)} size="icon" className="shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
