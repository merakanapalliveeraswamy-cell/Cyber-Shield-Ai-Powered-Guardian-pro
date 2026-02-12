import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Alerts = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setAlerts(data);
    };
    fetch();
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const severityColor: Record<string, string> = {
    low: "bg-success/10 text-success",
    medium: "bg-warning/10 text-warning",
    high: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("nav.alerts")}</h1>
      {alerts.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No alerts yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`shadow-card ${!alert.is_read ? "border-primary/30" : ""}`}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge className={severityColor[alert.severity] || ""}>
                    {alert.severity}
                  </Badge>
                  <CardTitle className="text-sm">{alert.alert_type}</CardTitle>
                </div>
                {!alert.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(alert.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
