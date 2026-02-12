import { useState } from "react";
import { Baby, Loader2, Shield, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GroomingResult {
  risk_level: "low" | "medium" | "high";
  indicators: string[];
  explanation: string;
}

const ChildSafety = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [chatText, setChatText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<GroomingResult | null>(null);

  const handleAnalyze = async () => {
    if (!chatText.trim()) return;
    setScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("detect-grooming", {
        body: { content: chatText },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const riskConfig = {
    low: { icon: Shield, color: "text-success", bg: "bg-success/10", label: "Low Risk" },
    medium: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Medium Risk" },
    high: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "High Risk" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("nav.childSafety")}</h1>
        <p className="text-muted-foreground">Paste chat excerpts for AI grooming & predator detection analysis. No chat text is stored.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-secondary" />
            Grooming Detection Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-[150px]"
            placeholder="Paste the chat conversation text here for analysis..."
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleAnalyze} disabled={scanning || !chatText.trim()} className="gradient-shield">
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Baby className="mr-2 h-4 w-4" />}
              {scanning ? "Analyzing..." : "Analyze Chat"}
            </Button>
            <p className="text-xs text-muted-foreground">🔒 Privacy-first: No chat text is permanently stored</p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={`border-2 shadow-card ${riskConfig[result.risk_level].bg}`}>
          <CardHeader className="flex flex-row items-center gap-3">
            {(() => {
              const Icon = riskConfig[result.risk_level].icon;
              return <Icon className={`h-8 w-8 ${riskConfig[result.risk_level].color}`} />;
            })()}
            <CardTitle className={riskConfig[result.risk_level].color}>
              {riskConfig[result.risk_level].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-card-foreground">{result.explanation}</p>
            {result.indicators && result.indicators.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold text-card-foreground">Detected Indicators:</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.indicators.map((ind, i) => (
                    <li key={i}>{ind}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChildSafety;
