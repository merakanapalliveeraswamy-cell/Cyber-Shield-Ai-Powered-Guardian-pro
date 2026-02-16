import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, ShieldAlert, ShieldCheck,
  AlertTriangle, Bell, ChevronDown, Mic, MicOff, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  alert_type: string;
  severity: "safe" | "caution" | "danger";
  title: string;
  message: string;
  action_suggestion: string;
  should_notify_parent: boolean;
  show_emergency_button: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  scanResult?: ScanResult;
  timestamp: Date;
}

const severityConfig = {
  safe: { bg: "bg-success/10", border: "border-success/30", text: "text-success", icon: ShieldCheck, label: "Safe" },
  caution: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", icon: AlertTriangle, label: "Caution" },
  danger: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", icon: ShieldAlert, label: "Danger" },
};

const ChatbotAlert = () => {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setUnreadAlerts(messages.filter((m) => m.scanResult?.severity === "danger").length);
  }, [messages]);

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not supported", description: "Speech recognition is not available in this browser.", variant: "destructive" });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : language === "ta" ? "ta-IN" : language === "kn" ? "kn-IN" : language === "ml" ? "ml-IN" : "en-IN";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, language, toast]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot-scan", {
        body: { message: text, profile_type: profile?.profile_type || "individual", language },
      });
      if (error) throw error;

      const result = data as ScanResult;
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: result.message, scanResult: result, timestamp: new Date(),
      }]);

      if (result.severity === "danger") {
        toast({ title: `⚠️ ${result.title}`, description: result.message.slice(0, 100), variant: "destructive" });
      }
    } catch (err: any) {
      const errMsg = err?.message || "Analysis failed";
      toast({ title: t("common.error"), description: errMsg, variant: "destructive" });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: errMsg, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!user) return null;

  const profileLabel =
    profile?.profile_type === "parent" ? "👨‍👩‍👧 Parent"
    : profile?.profile_type === "child" ? "🧒 Child"
    : profile?.profile_type === "elderly" ? "👵 Senior"
    : "👤 Individual";

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated gradient-shield text-primary-foreground transition-all hover:scale-105 active:scale-95 group"
        aria-label="Open Safety Chatbot"
      >
        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadAlerts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                {unreadAlerts}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-40 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 gradient-shield text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">CyberShield AI Guardian</p>
                <p className="text-[10px] opacity-80">{profileLabel} • India Safety Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-shield shadow-elevated">
                  <ShieldCheck className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AI-Powered Threat Scanner</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                    Paste any suspicious message, link, or text to scan for phishing, scams, UPI fraud & more.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {["Phishing", "UPI Scam", "Fraud Link", "Harassment", "Bank Fraud", "Cyberbullying"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] font-medium">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{msg.content}</div>
                  ) : (
                    <div className="max-w-[90%] space-y-2">
                      {msg.scanResult ? <AlertCard result={msg.scanResult} /> : (
                        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">{msg.content}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="animate-pulse">Scanning for threats...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={toggleVoice}
                title="Voice input"
              >
                {isListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste suspicious message or link..."
                className="min-h-[40px] max-h-[80px] resize-none text-sm"
                rows={1}
              />
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || loading} className="h-10 w-10 shrink-0 gradient-shield">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {isListening && (
              <p className="mt-1.5 text-[10px] text-destructive font-medium animate-pulse text-center">🎙️ Listening... Speak now</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const AlertCard = ({ result }: { result: ScanResult }) => {
  const config = severityConfig[result.severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${config.text}`} />
        <span className={`text-sm font-bold ${config.text}`}>{result.title}</span>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{result.message}</p>
      {result.action_suggestion && (
        <div className="rounded-lg bg-background/60 px-2.5 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">💡 {result.action_suggestion}</p>
        </div>
      )}
      {result.show_emergency_button && (
        <Button size="sm" variant="destructive" className="w-full text-xs" asChild>
          <a href="tel:112">🆘 Call Emergency (112)</a>
        </Button>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {result.should_notify_parent && (
          <Badge variant="outline" className="text-[10px] border-warning text-warning">Parent notified</Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">{result.alert_type.replace(/_/g, " ")}</Badge>
      </div>
    </div>
  );
};

export default ChatbotAlert;
