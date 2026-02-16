import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, X, Send, Loader2, ShieldAlert, ShieldCheck,
  AlertTriangle, ChevronDown, Mic, MicOff, Sparkles, Lock,
  Heart, Baby, Users, User,
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

type ProtectionMode = "parent" | "child" | "women" | "elderly" | "individual";

const severityConfig = {
  safe: { bg: "bg-success/10", border: "border-success/30", text: "text-success", icon: ShieldCheck, label: "Safe" },
  caution: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", icon: AlertTriangle, label: "Caution" },
  danger: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", icon: ShieldAlert, label: "Danger" },
};

// Mode-specific theme configuration
const modeThemes: Record<ProtectionMode, { gradient: string; label: string; icon: React.ElementType; accent: string; headerBg: string }> = {
  child: {
    gradient: "bg-gradient-to-r from-sky-500 to-cyan-400",
    label: "🧒 Child Mode",
    icon: Baby,
    accent: "text-sky-500",
    headerBg: "bg-gradient-to-r from-sky-500 to-cyan-400",
  },
  parent: {
    gradient: "bg-gradient-to-r from-emerald-600 to-teal-500",
    label: "👨‍👩‍👧 Parent Mode",
    icon: Users,
    accent: "text-emerald-500",
    headerBg: "bg-gradient-to-r from-emerald-600 to-teal-500",
  },
  women: {
    gradient: "bg-gradient-to-r from-purple-600 to-pink-500",
    label: "🛡️ Women Safety",
    icon: Heart,
    accent: "text-purple-500",
    headerBg: "bg-gradient-to-r from-purple-600 to-pink-500",
  },
  elderly: {
    gradient: "bg-gradient-to-r from-amber-600 to-orange-500",
    label: "👵 Senior Mode",
    icon: User,
    accent: "text-amber-500",
    headerBg: "bg-gradient-to-r from-amber-600 to-orange-500",
  },
  individual: {
    gradient: "gradient-shield",
    label: "👤 Individual",
    icon: User,
    accent: "text-primary",
    headerBg: "gradient-shield",
  },
};

const modeTags: Record<ProtectionMode, string[]> = {
  child: ["Stranger Danger", "Bullying", "Unsafe Links", "Ask Parent"],
  parent: ["Phishing", "Child Monitoring", "Threat Analytics", "Strict Filter"],
  women: ["Harassment", "Threat Detection", "Evidence", "Emergency"],
  elderly: ["UPI Scam", "Fake Calls", "Bank Fraud", "OTP Safety"],
  individual: ["Phishing", "UPI Scam", "Fraud Link", "Bank Fraud", "Privacy"],
};

const modeWelcome: Record<ProtectionMode, string> = {
  child: "Hi there! 👋 I'm your safety buddy. Paste any message and I'll check if it's safe! Remember to always ask your parent if something seems weird.",
  parent: "Welcome to CyberShield Guardian. Paste any suspicious message, link, or text for detailed threat analysis. You'll receive comprehensive reports on all detected threats.",
  women: "Welcome to your safety space. 💜 I can detect harassment, threats, and suspicious messages. You can also save evidence and activate emergency alerts from here.",
  elderly: "Namaste! 🙏 I will check messages for scams and fraud. Just paste any suspicious message here. Remember: NEVER share OTP or bank details with anyone!",
  individual: "Paste any suspicious message, link, or text to scan for phishing, scams, UPI fraud & more.",
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

  // Derive protection mode from profile_type
  const mode: ProtectionMode = (profile?.profile_type as ProtectionMode) || "individual";
  const theme = modeThemes[mode];
  const tags = modeTags[mode];
  const welcome = modeWelcome[mode];

  // Check if mode is properly selected
  const isModeSelected = !!profile?.profile_type;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setUnreadAlerts(messages.filter((m) => m.scanResult?.severity === "danger").length);
  }, [messages]);

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
      setInput((prev) => prev + (prev ? " " : "") + event.results[0][0].transcript);
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
      // Send the actual profile_type (maps to mode on server)
      const serverMode = mode === "women" ? "women" : profile?.profile_type || "individual";
      const { data, error } = await supabase.functions.invoke("chatbot-scan", {
        body: { message: text, profile_type: serverMode, language },
      });
      if (error) throw error;

      const result = data as ScanResult;

      // Child mode: prevent dismissing high-risk alerts (client-side enforcement)
      if (mode === "child" && result.severity === "danger") {
        result.should_notify_parent = true;
      }

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

  return (
    <>
      {/* Floating Button - themed per mode */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated text-white transition-all hover:scale-105 active:scale-95 ${theme.headerBg}`}
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
          {/* Header - themed per mode */}
          <div className={`flex items-center justify-between px-4 py-3 text-white ${theme.headerBg}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">CyberShield AI Guardian</p>
                <p className="text-[10px] opacity-90">{theme.label} • India Safety Platform</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Fail-safe: No mode selected */}
          {!isModeSelected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mode Not Selected</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                  Please select a protection mode to activate AI Guardian. Go to Settings or complete onboarding.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-elevated text-white ${theme.headerBg}`}>
                      <theme.icon className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">AI-Powered Threat Scanner</p>
                      <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">{welcome}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] font-medium">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "user" ? (
                        <div className={`max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white ${theme.headerBg}`}>
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[90%] space-y-2">
                          {msg.scanResult ? <AlertCard result={msg.scanResult} mode={mode} /> : (
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
                        <span className="animate-pulse">
                          {mode === "child" ? "Checking message... 🔍" : "Scanning for threats..."}
                        </span>
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
                    placeholder={mode === "child" ? "Paste a message to check if it's safe..." : "Paste suspicious message or link..."}
                    className="min-h-[40px] max-h-[80px] resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className={`h-10 w-10 shrink-0 text-white ${theme.headerBg}`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {isListening && (
                  <p className="mt-1.5 text-[10px] text-destructive font-medium animate-pulse text-center">🎙️ Listening... Speak now</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

const AlertCard = ({ result, mode }: { result: ScanResult; mode: ProtectionMode }) => {
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
      {/* Women mode: always show emergency for danger */}
      {result.show_emergency_button && (
        <Button size="sm" variant="destructive" className="w-full text-xs" asChild>
          <a href="tel:112">🆘 Call Emergency (112)</a>
        </Button>
      )}
      {/* Women mode: evidence save option for danger */}
      {mode === "women" && result.severity === "danger" && (
        <Button size="sm" variant="outline" className="w-full text-xs border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30">
          📋 Save as Evidence
        </Button>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {result.should_notify_parent && (
          <Badge variant="outline" className="text-[10px] border-warning text-warning">
            {mode === "child" ? "⚠️ Parent will be notified" : "Parent notified"}
          </Badge>
        )}
        {/* Child mode: show restriction badge for danger */}
        {mode === "child" && result.severity === "danger" && (
          <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
            🔒 Auto-blocked
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">{result.alert_type.replace(/_/g, " ")}</Badge>
      </div>
    </div>
  );
};

export default ChatbotAlert;
