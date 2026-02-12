import { useState } from "react";
import { Heart, Loader2, Shield, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import EmergencyCallout from "@/components/EmergencyCallout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WomenSafety = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("safety-advisor", {
        body: { content: input, context: "women_safety" },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const resources = [
    { name: "National Cyber Crime Portal", url: "https://cybercrime.gov.in" },
    { name: "Women Helpline (181)", url: "tel:181" },
    { name: "NCW - National Commission for Women", url: "https://ncw.nic.in" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("nav.womenSafety")}</h1>
        <p className="text-muted-foreground">Paste suspicious messages for AI threat analysis. Get guidance on safe reporting.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Threat Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-[150px]"
            placeholder="Paste suspicious message, profile details, or threat content here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button onClick={handleAnalyze} disabled={scanning || !input.trim()} className="gradient-shield">
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
            {scanning ? "Analyzing..." : "Analyze Threat"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="shadow-card border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Safety Advisory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Risk Level:</span>
              <span className={`font-bold ${
                result.risk_level === "high" ? "text-destructive" : result.risk_level === "medium" ? "text-warning" : "text-success"
              }`}>
                {result.risk_level?.toUpperCase()}
              </span>
            </div>
            <p className="text-card-foreground">{result.explanation}</p>
            {result.guidance && (
              <div>
                <h4 className="mb-2 font-semibold">What to do next:</h4>
                <p className="text-sm text-muted-foreground">{result.guidance}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (result.risk_level === "high" || result.risk_level === "medium") && (
        <EmergencyCallout type="women" />
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Important Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resources.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
                {r.name}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WomenSafety;
