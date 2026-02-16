import { useState, useMemo } from "react";
import {
  Bell, Check, CheckCheck, ShieldAlert, AlertTriangle, ShieldCheck,
  Filter, TrendingUp, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAlerts } from "@/hooks/useAlerts";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const severityColor: Record<string, string> = {
  low: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

const severityIcon: Record<string, React.ElementType> = {
  high: ShieldAlert,
  medium: AlertTriangle,
  low: ShieldCheck,
};

const CHART_COLORS = [
  "hsl(0, 72%, 51%)",   // destructive
  "hsl(38, 92%, 50%)",  // warning
  "hsl(142, 71%, 45%)", // success
  "hsl(210, 90%, 45%)", // primary
  "hsl(280, 60%, 50%)", // purple
  "hsl(25, 90%, 50%)",  // orange
];

const Alerts = () => {
  const { t } = useLanguage();
  const { alerts, unreadCount, loading, markRead, markAllRead } = useAlerts();
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterType !== "all" && a.alert_type !== filterType) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterType]);

  const alertTypes = useMemo(() => [...new Set(alerts.map((a) => a.alert_type))], [alerts]);

  // Chart data
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => { counts[a.alert_type] = (counts[a.alert_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));
  }, [alerts]);

  const severityDistribution = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      if (a.severity in counts) counts[a.severity as keyof typeof counts]++;
    });
    return [
      { name: "High", value: counts.high, fill: "hsl(0, 72%, 51%)" },
      { name: "Medium", value: counts.medium, fill: "hsl(38, 92%, 50%)" },
      { name: "Low", value: counts.low, fill: "hsl(142, 71%, 45%)" },
    ].filter((d) => d.value > 0);
  }, [alerts]);

  const weeklyTrend = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-IN", { weekday: "short" });
      days[key] = 0;
    }
    alerts.forEach((a) => {
      const d = new Date(a.created_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diff < 7) {
        const key = d.toLocaleDateString("en-IN", { weekday: "short" });
        if (key in days) days[key]++;
      }
    });
    return Object.entries(days).map(([day, count]) => ({ day, count }));
  }, [alerts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("nav.alerts")}</h1>
          <p className="text-sm text-muted-foreground">Threat detection history & analytics</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.filter((a) => a.severity === "high").length}</p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.filter((a) => a.severity === "medium").length}</p>
              <p className="text-xs text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total Threats Detected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {alerts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4" /> Weekly Threat Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" /> Threat Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alert type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {alertTypes.map((type) => (
              <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No alerts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const Icon = severityIcon[alert.severity] || Bell;
            return (
              <Card key={alert.id} className={`shadow-card transition-all ${!alert.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${severityColor[alert.severity]?.split(" ")[0]}`}>
                      <Icon className={`h-4 w-4 ${severityColor[alert.severity]?.split(" ")[1]}`} />
                    </div>
                    <div>
                      <Badge className={`${severityColor[alert.severity]} border`}>{alert.severity}</Badge>
                      <span className="ml-2 text-sm font-medium capitalize">{alert.alert_type.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  {!alert.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(alert.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">{new Date(alert.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
