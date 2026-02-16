import { useState, useRef, useEffect } from "react";
import {
  MessageCircle, X, Send, Loader2, ShieldAlert, ShieldCheck,
  AlertTriangle, Bell, Siren, ChevronDown,
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
  safe: {
    bg: "bg-success/10",
    border: "border-success/30",
    text: "text-success",
    icon: ShieldCheck,
    label: "Safe",
  },
  caution: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    icon: AlertTriangle,
    label: "Caution",
  },
  danger: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    icon: ShieldAlert,
    label: "Danger",
  },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const dangerCount = messages.filter(
      (m) => m.scanResult && m.scanResult.severity === "danger"
    ).length;
    setUnreadAlerts(dangerCount);
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot-scan", {
        body: {
          message: text,
          profile_type: profile?.profile_type || "individual",
          language: language,
        },
      });

      if (error) throw error;

      const result = data as ScanResult;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message,
        scanResult: result,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Show toast for danger alerts
      if (result.severity === "danger") {
        toast({
          title: `⚠️ ${result.title}`,
          description: result.message.slice(0, 100),
          variant: "destructive",
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || "Analysis failed";
      toast({ title: t("common.error"), description: errMsg, variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errMsg,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated gradient-shield text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        aria-label="Open Safety Chatbot"
      >
        {open ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadAlerts > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadAlerts}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-40 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 gradient-shield text-primary-foreground">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">CyberShield AI</p>
                <p className="text-[10px] opacity-80">{profileLabel} Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Bell className="h-4 w-4 opacity-70" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t("chatbot.welcome" as any) || "Paste any suspicious message, link, or text to scan for threats."}
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {["Phishing", "UPI Scam", "Fraud Link", "Harassment"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] space-y-2">
                      {msg.scanResult && (
                        <AlertCard result={msg.scanResult} />
                      )}
                      {!msg.scanResult && (
                        <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatbot.placeholder" as any) || "Paste suspicious message or link..."}
                className="min-h-[40px] max-h-[80px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="h-10 w-10 shrink-0 gradient-shield"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
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
        <div className="rounded-lg bg-background/60 px-2 py-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            💡 {result.action_suggestion}
          </p>
        </div>
      )}
      {result.show_emergency_button && (
        <Button size="sm" variant="destructive" className="w-full text-xs" asChild>
          <a href="tel:112">🆘 Call Emergency (112)</a>
        </Button>
      )}
      {result.should_notify_parent && (
        <Badge variant="outline" className="text-[10px] border-warning text-warning">
          Parent notified
        </Badge>
      )}
      <Badge variant="secondary" className="text-[10px]">
        {result.alert_type.replace(/_/g, " ")}
      </Badge>
    </div>
  );
};

export default ChatbotAlert;
