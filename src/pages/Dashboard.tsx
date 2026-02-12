import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Search, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ totalScans: 0, threats: 0, dangerous: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase
        .from("scan_history")
        .select("verdict")
        .eq("user_id", user.id);
      if (data) {
        setStats({
          totalScans: data.length,
          threats: data.filter((s: any) => s.verdict !== "safe").length,
          dangerous: data.filter((s: any) => s.verdict === "dangerous").length,
        });
      }
    };
    fetchStats();
  }, [user]);

  const cards = [
    { icon: Search, label: t("dashboard.title"), value: stats.totalScans, color: "text-primary" },
    { icon: AlertTriangle, label: t("dashboard.threats"), value: stats.threats, color: "text-warning" },
    { icon: Shield, label: t("dashboard.scams"), value: stats.dangerous, color: "text-destructive" },
    { icon: TrendingUp, label: t("dashboard.riskScore"), value: stats.dangerous > 3 ? "High" : stats.threats > 0 ? "Medium" : "Low", color: "text-secondary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats.totalScans === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("dashboard.noData")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
