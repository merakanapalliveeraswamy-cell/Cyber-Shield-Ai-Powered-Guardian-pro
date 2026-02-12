import { useState } from "react";
import { Search, Shield, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import EmergencyCallout from "@/components/EmergencyCallout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  verdict: "safe" | "suspicious" | "dangerous";
  risk_level: string;
  category: string;
  explanation: string;
}

const Scanner = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const isElderly = profile?.profile_type === "elderly";

  const handleScan = async (type: "text" | "url") => {
    const content = type === "text" ? textInput : urlInput;
    if (!content.trim()) return;

    setScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scan-message", {
        body: { content, type },
      });

      if (error) throw error;

      const scanResult: ScanResult = data;
      setResult(scanResult);

      // Save to history
      if (user) {
        await supabase.from("scan_history").insert({
          user_id: user.id,
          content_type: type,
          input_text: type === "text" ? content : null,
          input_url: type === "url" ? content : null,
          verdict: scanResult.verdict,
          risk_level: scanResult.risk_level,
          category: scanResult.category,
          ai_explanation: scanResult.explanation,
        });
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const verdictConfig = {
    safe: { icon: Shield, color: "text-success", bg: "bg-success/10", border: "border-success/30", label: t("scanner.result.safe") },
    suspicious: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: t("scanner.result.suspicious") },
    dangerous: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", label: t("scanner.result.dangerous") },
  };

  // Elderly simplified UI
  if (isElderly) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 py-8">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">{t("scanner.elderly.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("scanner.elderly.subtitle")}</p>
        <Textarea
          className="max-w-lg text-lg min-h-[150px]"
          placeholder={t("scanner.textPlaceholder")}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        <Button
          size="lg"
          className="h-20 w-64 text-2xl font-bold gradient-shield animate-pulse-shield"
          onClick={() => handleScan("text")}
          disabled={scanning || !textInput.trim()}
        >
          {scanning ? <Loader2 className="h-8 w-8 animate-spin" /> : t("scanner.elderly.button")}
        </Button>
        {result && (
          <Card className={`w-full max-w-lg border-2 ${verdictConfig[result.verdict].border} ${verdictConfig[result.verdict].bg}`}>
            <CardContent className="flex flex-col items-center py-8 text-center">
              {(() => {
                const Icon = verdictConfig[result.verdict].icon;
                return <Icon className={`mb-4 h-16 w-16 ${verdictConfig[result.verdict].color}`} />;
              })()}
              <h2 className={`text-3xl font-bold ${verdictConfig[result.verdict].color}`}>
                {verdictConfig[result.verdict].label}
              </h2>
              <p className="mt-4 text-lg text-card-foreground">{result.explanation}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("scanner.title")}</h1>
        <p className="text-muted-foreground">{t("scanner.subtitle")}</p>
      </div>

      <Tabs defaultValue="text" className="w-full">
        <TabsList>
          <TabsTrigger value="text">{t("scanner.textTab")}</TabsTrigger>
          <TabsTrigger value="url">{t("scanner.urlTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <Textarea
            className="min-h-[150px]"
            placeholder={t("scanner.textPlaceholder")}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <Button onClick={() => handleScan("text")} disabled={scanning || !textInput.trim()} className="gradient-shield">
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {scanning ? t("scanner.scanning") : t("scanner.scanButton")}
          </Button>
        </TabsContent>
        <TabsContent value="url" className="space-y-4">
          <Input placeholder={t("scanner.urlPlaceholder")} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          <Button onClick={() => handleScan("url")} disabled={scanning || !urlInput.trim()} className="gradient-shield">
            {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {scanning ? t("scanner.scanning") : t("scanner.scanButton")}
          </Button>
        </TabsContent>
      </Tabs>

      {result && (
        <Card className={`border-2 ${verdictConfig[result.verdict].border} ${verdictConfig[result.verdict].bg} shadow-card`}>
          <CardHeader className="flex flex-row items-center gap-3">
            {(() => {
              const Icon = verdictConfig[result.verdict].icon;
              return <Icon className={`h-8 w-8 ${verdictConfig[result.verdict].color}`} />;
            })()}
            <div>
              <CardTitle className={verdictConfig[result.verdict].color}>{verdictConfig[result.verdict].label}</CardTitle>
              <p className="text-sm text-muted-foreground">{result.category}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-card-foreground">{result.explanation}</p>
          </CardContent>
        </Card>
      )}

      {result && result.verdict === "dangerous" && (
        <EmergencyCallout type="scam" />
      )}
    </div>
  );
};

export default Scanner;
