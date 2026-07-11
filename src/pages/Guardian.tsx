import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Shield, Send, Plus, Trash2, Pin, PinOff, Search, Mic, MicOff,
  Copy, RefreshCcw, ThumbsUp, ThumbsDown, Download, Loader2,
  Sparkles, Siren, Phone, AlertTriangle, MessageCircle, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Thread {
  id: string;
  title: string;
  pinned: boolean;
  last_message_at: string;
}
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const SUGGESTIONS = [
  "Check this website for me",
  "Is this UPI request safe?",
  "How to report a cybercrime?",
  "Advice for my child's online safety",
  "I'm being harassed online — help",
  "Explain digital arrest scam",
];

const EMERGENCY_TRIGGERS = /\b(help|sos|emergency|kidnapp|blackmail|suicide|cyber attack|bank fraud|urgent|threat)\b/i;

export default function Guardian() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [search, setSearch] = useState("");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_threads")
      .select("id,title,pinned,last_message_at")
      .order("pinned", { ascending: false })
      .order("last_message_at", { ascending: false });
    setThreads(data || []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
    if (!data || data.length === 0) createThread();
  }, [user]); // eslint-disable-line

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Load messages
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true });
      setMessages((data as Msg[]) || []);
    })();
  }, [activeId]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamText]);

  // Focus composer
  useEffect(() => { textRef.current?.focus(); }, [activeId]);

  const createThread = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, title: "New chat" })
      .select("id,title,pinned,last_message_at")
      .single();
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setThreads((p) => [data as Thread, ...p]);
    setActiveId(data!.id);
    setMessages([]);
  };

  const deleteThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    setThreads((p) => p.filter((t) => t.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const togglePin = async (t: Thread) => {
    await supabase.from("chat_threads").update({ pinned: !t.pinned }).eq("id", t.id);
    loadThreads();
  };

  const renameThread = async (id: string, title: string) => {
    await supabase.from("chat_threads").update({ title }).eq("id", id);
    setThreads((p) => p.map((t) => (t.id === id ? { ...t, title } : t)));
  };

  const speakText = (text: string) => {
    if (!speak || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[#*`_>|-]/g, "").slice(0, 500));
    u.rate = 1; u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming || !activeId || !user) return;

    if (EMERGENCY_TRIGGERS.test(text)) setShowEmergency(true);

    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setStreaming(true);
    setStreamText("");

    // Persist user msg + auto-title
    const isFirst = messages.length === 0;
    await supabase.from("chat_messages").insert({
      thread_id: activeId, user_id: user.id, role: "user", content: text,
    });
    if (isFirst) {
      const title = text.slice(0, 48) + (text.length > 48 ? "…" : "");
      renameThread(activeId, title);
    }

    // Build history payload
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guardian-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setStreamText(full);
            }
          } catch { /* ignore */ }
        }
      }

      const assistantMsg: Msg = {
        id: crypto.randomUUID(), role: "assistant", content: full, created_at: new Date().toISOString(),
      };
      setMessages((p) => [...p, assistantMsg]);
      setStreamText("");
      await supabase.from("chat_messages").insert({
        thread_id: activeId, user_id: user.id, role: "assistant", content: full,
      });
      await supabase.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", activeId);
      speakText(full);

      // Auto-log threat alerts when analysis detects a scam
      if (/threat level.*(HIGH|CRITICAL|SUSPICIOUS)/i.test(full)) {
        supabase.functions.invoke("classify-alert", {
          body: {
            alert_type: "guardian_scan",
            message: text,
            source: "AI Guardian",
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      toast({ title: "Guardian error", description: err.message, variant: "destructive" });
      setStreamText("");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // remove last assistant if any
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      await supabase.from("chat_messages").delete().eq("id", lastAssistant.id);
      setMessages((p) => p.filter((m) => m.id !== lastAssistant.id));
    }
    send(lastUser.content);
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast({ title: "Not supported", description: "Voice input unavailable in this browser." });
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = "en-IN";
    r.onresult = (e: any) => { setInput((p) => (p ? p + " " : "") + e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r; r.start(); setListening(true);
  };

  const exportChat = () => {
    const md = messages.map((m) => `**${m.role === "user" ? "You" : "Guardian"}** — ${new Date(m.created_at).toLocaleString()}\n\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cybershield-chat-${Date.now()}.md`;
    a.click();
  };

  const filteredThreads = useMemo(
    () => threads.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())),
    [threads, search]
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 text-slate-100 shadow-2xl backdrop-blur-xl">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col rounded-xl border border-white/5 bg-slate-950/60 p-3 backdrop-blur md:flex">
        <Button onClick={createThread} className="mb-3 gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="border-white/10 bg-slate-900/60 pl-8 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-1">
            {filteredThreads.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                  activeId === t.id
                    ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white ring-1 ring-emerald-400/30"
                    : "text-slate-300 hover:bg-white/5"
                )}
              >
                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="flex-1 truncate">{t.title}</span>
                <button onClick={(e) => { e.stopPropagation(); togglePin(t); }} className="opacity-0 transition group-hover:opacity-100">
                  {t.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 transition group-hover:opacity-100 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-slate-300">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-400">
            <Shield className="h-3.5 w-3.5" /> India Cyber Guardian
          </div>
          Powered by CyberShield AI · 1930 · 112 · 1098
        </div>
      </aside>

      {/* Chat area */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-xl">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 shadow-lg shadow-emerald-500/30">
              <Shield className="h-5 w-5 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">CyberShield AI Guardian</p>
              <p className="text-[11px] text-slate-400">Online · Specialized in Indian cyber safety</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSpeak((s) => !s)} title={speak ? "Voice off" : "Voice on"} className="text-slate-300 hover:text-white">
              {speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={exportChat} title="Export chat" className="text-slate-300 hover:text-white">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowEmergency((s) => !s)} title="Emergency" className="text-red-400 hover:text-red-300">
              <Siren className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Emergency panel */}
        {showEmergency && (
          <div className="border-b border-red-500/30 bg-gradient-to-r from-red-950/70 to-slate-950 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
              <AlertTriangle className="h-4 w-4" /> Emergency contacts
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {[
                { n: "1930", l: "Cyber crime" },
                { n: "112", l: "Police / SOS" },
                { n: "1098", l: "Childline" },
                { n: "181", l: "Women helpline" },
                { n: "9152987821", l: "iCall mental" },
                { n: "1091", l: "Women police" },
              ].map((c) => (
                <a key={c.n} href={`tel:${c.n}`} className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center text-xs text-red-200 hover:bg-red-500/20">
                  <Phone className="mx-auto mb-1 h-3.5 w-3.5" />
                  <div className="font-bold text-white">{c.n}</div>
                  {c.l}
                </a>
              ))}
            </div>
            <div className="mt-2 text-center">
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-xs text-red-300 underline">Report on cybercrime.gov.in →</a>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {messages.length === 0 && !streaming && (
            <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 shadow-2xl shadow-emerald-500/40">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Hello 👋 I'm your Cyber Guardian</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                I help protect Indian citizens from scams, phishing, cybercrime, fake apps, online fraud,
                child exploitation and digital threats. Ask me anything — paste any suspicious message or link.
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="group rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                  >
                    <Sparkles className="mb-1 h-4 w-4 text-emerald-400" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                msg={m}
                isLast={i === messages.length - 1}
                onCopy={() => { navigator.clipboard.writeText(m.content); toast({ title: "Copied" }); }}
                onRegenerate={m.role === "assistant" && i === messages.length - 1 && !streaming ? regenerate : undefined}
              />
            ))}
            {streaming && (
              <MessageBubble
                msg={{ id: "streaming", role: "assistant", content: streamText || "…", created_at: new Date().toISOString() }}
                streaming
              />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-white/5 bg-slate-950/60 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-2 shadow-lg focus-within:border-emerald-400/50 focus-within:ring-2 focus-within:ring-emerald-400/20">
            <Button
              type="button" variant="ghost" size="icon"
              onClick={toggleVoice}
              className={cn("shrink-0 text-slate-300 hover:text-white", listening && "text-red-400")}
            >
              {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Textarea
              ref={textRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask CyberShield AI Guardian… (paste a suspicious message, link, or ask for advice)"
              rows={1}
              className="min-h-[40px] max-h-[160px] resize-none border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:ring-0"
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="shrink-0 gap-1 bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:opacity-90"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-500">
            Guardian may make mistakes. Verify critical info with official authorities · Enter to send, Shift+Enter for newline
          </p>
        </div>
      </section>
    </div>
  );
}

function MessageBubble({
  msg, streaming, onCopy, onRegenerate, isLast,
}: {
  msg: Msg; streaming?: boolean; onCopy?: () => void; onRegenerate?: () => void; isLast?: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        isUser ? "bg-slate-700" : "bg-gradient-to-br from-emerald-500 to-blue-500"
      )}>
        {isUser ? <span className="text-xs font-bold text-white">You</span> : <Shield className="h-4 w-4 text-white" />}
      </div>
      <div className={cn("min-w-0 flex-1", isUser && "flex flex-col items-end")}>
        <div className={cn(
          "inline-block max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md",
          isUser
            ? "bg-gradient-to-br from-blue-600 to-emerald-600 text-white"
            : "border border-white/10 bg-slate-900/70 text-slate-100"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-strong:text-emerald-300 prose-a:text-blue-400 prose-code:text-emerald-300 prose-table:text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || "…"}</ReactMarkdown>
              {streaming && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-emerald-400" />}
            </div>
          )}
        </div>
        {!isUser && !streaming && (
          <div className="mt-1.5 flex items-center gap-1 text-slate-500">
            <button onClick={onCopy} className="rounded p-1 hover:bg-white/5 hover:text-white" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="rounded p-1 hover:bg-white/5 hover:text-white" title="Regenerate"><RefreshCcw className="h-3.5 w-3.5" /></button>
            )}
            <button className="rounded p-1 hover:bg-white/5 hover:text-white" title="Helpful"><ThumbsUp className="h-3.5 w-3.5" /></button>
            <button className="rounded p-1 hover:bg-white/5 hover:text-white" title="Not helpful"><ThumbsDown className="h-3.5 w-3.5" /></button>
            <span className="ml-auto text-[10px]">{new Date(msg.created_at).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
