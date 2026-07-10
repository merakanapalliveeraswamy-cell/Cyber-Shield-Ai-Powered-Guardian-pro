import { useState, useMemo } from "react";
import {
  Bell, Check, CheckCheck, ShieldAlert, AlertTriangle, ShieldCheck, Shield,
  Filter, TrendingUp, Search, X, Clock, MapPin, Smartphone, Sparkles,
  Activity, Zap, Eye, Ban, FileText, PhoneCall, Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const sevMeta: Record<string, { label: string; icon: React.ElementType; ring: string; text: string; bg: string; glow: string; dot: string }> = {
  critical: { label: "Critical", icon: ShieldAlert, ring: "ring-rose-500/40", text: "text-rose-400", bg: "bg-rose-500/10", glow: "shadow-[0_0_30px_-8px_rgba(244,63,94,0.6)]", dot: "bg-rose-500" },
  high:     { label: "High",     icon: ShieldAlert, ring: "ring-orange-500/40", text: "text-orange-400", bg: "bg-orange-500/10", glow: "shadow-[0_0_25px_-8px_rgba(249,115,22,0.55)]", dot: "bg-orange-500" },
  medium:   { label: "Medium",   icon: AlertTriangle, ring: "ring-amber-500/40", text: "text-amber-400", bg: "bg-amber-500/10", glow: "shadow-[0_0_20px_-8px_rgba(245,158,11,0.5)]", dot: "bg-amber-500" },
  low:      { label: "Low",      icon: ShieldCheck, ring: "ring-yellow-500/30", text: "text-yellow-400", bg: "bg-yellow-500/10", glow: "", dot: "bg-yellow-500" },
  safe:     { label: "Safe",     icon: ShieldCheck, ring: "ring-emerald-500/40", text: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-[0_0_20px_-8px_rgba(16,185,129,0.5)]", dot: "bg-emerald-500" },
};

const statusMeta: Record<string, { label: string; className: string }> = {
  new:            { label: "New",            className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  investigating:  { label: "Investigating",  className: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  blocked:        { label: "Blocked",        className: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  resolved:       { label: "Resolved",       className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  false_positive: { label: "False Positive", className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
};

const CHART_COLORS = ["#f43f5e", "#f97316", "#f59e0b", "#eab308", "#10b981", "#38bdf8", "#a78bfa"];

function StatCard({ icon: Icon, label, value, tone, delay = 0 }: { icon: React.ElementType; label: string; value: number | string; tone: string; delay?: number }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-4 backdrop-blur-xl transition-all hover:border-white/10 hover:-translate-y-0.5 animate-fade-in",
        tone,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-white tabular-nums">{value}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/50">{label}</p>
        </div>
      </div>
    </div>
  );
}

const Alerts = () => {
  const { alerts, unreadCount, loading, realtimeStatus, markRead, markAllRead } = useAlerts();
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Alert | null>(null);

  const alertTypes = useMemo(() => [...new Set(alerts.map((a) => a.alert_type))], [alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && (a.status ?? "new") !== filterStatus) return false;
      if (filterType !== "all" && a.alert_type !== filterType) return false;
      if (q) {
        const hay = `${a.title ?? ""} ${a.message} ${a.alert_type} ${a.source ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, filterSeverity, filterStatus, filterType, query]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 86_400_000;
    let critical = 0, high = 0, medium = 0, low = 0, safe = 0, today = 0, week = 0;
    for (const a of alerts) {
      if (a.severity === "critical") critical++;
      else if (a.severity === "high") high++;
      else if (a.severity === "medium") medium++;
      else if (a.severity === "low") low++;
      else if (a.severity === "safe") safe++;
      const diff = now - new Date(a.created_at).getTime();
      if (diff < day) today++;
      if (diff < day * 7) week++;
    }
    return { critical, high, medium, low, safe, total: alerts.length, today, week };
  }, [alerts]);

  const typeDist = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => { counts[a.alert_type] = (counts[a.alert_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [alerts]);

  const weeklyTrend = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toLocaleDateString("en-IN", { weekday: "short" })] = 0;
    }
    alerts.forEach((a) => {
      const d = new Date(a.created_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
      if (diff < 7) {
        const key = d.toLocaleDateString("en-IN", { weekday: "short" });
        if (key in days) days[key]++;
      }
    });
    return Object.entries(days).map(([day, count]) => ({ day, count }));
  }, [alerts]);

  const rtDot = realtimeStatus === "connected" ? "bg-emerald-500" :
                realtimeStatus === "reconnecting" ? "bg-amber-500 animate-pulse" :
                realtimeStatus === "error" ? "bg-rose-500" : "bg-zinc-500";

  return (
    <div className="min-h-full -m-4 sm:-m-6 bg-[#0a0e1a] p-4 sm:p-6 text-white">
      {/* Ambient grid */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_50%)]" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-400/80">
              <Radio className="h-3.5 w-3.5" /> CyberShield SOC
              <span className={cn("ml-2 inline-block h-2 w-2 rounded-full", rtDot)} />
              <span className="text-white/40 normal-case tracking-normal">{realtimeStatus}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-sm text-white/50">Threat Detection History &amp; AI Analytics</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read ({unreadCount})
            </Button>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <StatCard icon={ShieldAlert}   label="Critical" value={stats.critical} tone="text-rose-400" delay={0} />
          <StatCard icon={ShieldAlert}   label="High"     value={stats.high}     tone="text-orange-400" delay={40} />
          <StatCard icon={AlertTriangle} label="Medium"   value={stats.medium}   tone="text-amber-400" delay={80} />
          <StatCard icon={ShieldCheck}   label="Low"      value={stats.low}      tone="text-yellow-400" delay={120} />
          <StatCard icon={Shield}        label="Safe"     value={stats.safe}     tone="text-emerald-400" delay={160} />
          <StatCard icon={Activity}      label="Total"    value={stats.total}    tone="text-sky-400" delay={200} />
          <StatCard icon={TrendingUp}    label="This Week" value={stats.week}    tone="text-violet-400" delay={240} />
        </div>

        {/* Charts */}
        {alerts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                <Zap className="h-4 w-4 text-sky-400" /> Threat Trend (7 days)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                  <Bar dataKey="count" fill="url(#gradSky)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="gradSky" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                <Filter className="h-4 w-4 text-violet-400" /> Threat Categories
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={typeDist} cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10, fill: "#fff" }}>
                    {typeDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-3 backdrop-blur-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search alerts, phone, URL, keyword…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40 focus-visible:ring-sky-500/40"
            />
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-white"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="false_positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[170px] border-white/10 bg-white/5 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {alertTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-slate-900/50 py-16 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_60%)]" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                <Shield className="relative h-16 w-16 text-emerald-400" />
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">🎉 Great News!</h3>
              <p className="max-w-sm text-sm text-white/60">
                No threats detected. Your family is currently protected by CyberShield AI. Continue browsing safely.
              </p>
            </div>
          </div>
        )}

        {/* Alert list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((a, i) => {
              const meta = sevMeta[a.severity] ?? sevMeta.medium;
              const Icon = meta.icon;
              const status = statusMeta[a.status ?? "new"] ?? statusMeta.new;
              return (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); if (!a.is_read) markRead(a.id); }}
                  className={cn(
                    "group relative w-full overflow-hidden rounded-xl border border-white/5 bg-slate-900/60 p-4 text-left backdrop-blur-xl transition-all hover:border-white/15 hover:bg-slate-900/80 animate-fade-in",
                    meta.glow,
                    !a.is_read && "ring-1 ring-sky-500/30",
                  )}
                  style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                >
                  <div className={cn("absolute left-0 top-0 h-full w-1", meta.dot)} />
                  <div className="flex items-start gap-4 pl-2">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", meta.bg, meta.ring)}>
                      <Icon className={cn("h-5 w-5", meta.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white truncate">
                          {a.title || a.alert_type.replace(/_/g, " ")}
                        </p>
                        <Badge className={cn("border capitalize", meta.bg, meta.text, meta.ring.replace("ring-", "border-"))}>
                          {meta.label}
                        </Badge>
                        <Badge className={cn("border", status.className)}>{status.label}</Badge>
                        {typeof a.confidence === "number" && (
                          <span className="flex items-center gap-1 text-[11px] text-white/50">
                            <Sparkles className="h-3 w-3" /> {a.confidence}%
                          </span>
                        )}
                        {typeof a.risk_score === "number" && (
                          <span className="text-[11px] text-white/50">Risk {a.risk_score}/100</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-white/60 line-clamp-2">{a.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/40">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.created_at).toLocaleString()}</span>
                        {a.source && <span className="flex items-center gap-1"><Radio className="h-3 w-3" />{a.source}</span>}
                        {a.device && <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" />{a.device}</span>}
                        {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
                      </div>
                    </div>
                    <Eye className="h-4 w-4 shrink-0 text-white/30 transition group-hover:text-sky-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Details drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full border-l border-white/10 bg-[#0a0e1a] text-white sm:max-w-lg">
          {selected && <AlertDetails alert={selected} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function AlertDetails({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const meta = sevMeta[alert.severity] ?? sevMeta.medium;
  const Icon = meta.icon;
  const recs = Array.isArray(alert.recommendations) ? (alert.recommendations as string[]) : [];
  const evidence = Array.isArray(alert.evidence) ? (alert.evidence as unknown[]) : [];

  const timeline = [
    { time: alert.created_at, label: "Threat Detected", icon: ShieldAlert },
    { time: alert.created_at, label: "AI Analysis Completed", icon: Sparkles },
    ...(alert.status === "blocked" || alert.status === "resolved"
      ? [{ time: alert.updated_at ?? alert.created_at, label: alert.status === "blocked" ? "Threat Blocked" : "Resolved", icon: Check }]
      : []),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        <SheetHeader className="space-y-3 text-left">
          <div className="flex items-start justify-between">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl ring-1", meta.bg, meta.ring)}>
              <Icon className={cn("h-6 w-6", meta.text)} />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></Button>
          </div>
          <SheetTitle className="text-white">{alert.title || alert.alert_type.replace(/_/g, " ")}</SheetTitle>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("border capitalize", meta.bg, meta.text)}>{meta.label}</Badge>
            <Badge className={cn("border", (statusMeta[alert.status ?? "new"] ?? statusMeta.new).className)}>
              {(statusMeta[alert.status ?? "new"] ?? statusMeta.new).label}
            </Badge>
            {typeof alert.confidence === "number" && <Badge variant="outline" className="border-white/10 text-white/70">AI {alert.confidence}%</Badge>}
            {typeof alert.risk_score === "number" && <Badge variant="outline" className="border-white/10 text-white/70">Risk {alert.risk_score}/100</Badge>}
          </div>
        </SheetHeader>

        {/* Risk gauge */}
        {typeof alert.risk_score === "number" && (
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>Risk Score</span><span className="text-white">{alert.risk_score}/100</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn("h-full rounded-full transition-all", meta.dot)}
                style={{ width: `${alert.risk_score}%` }}
              />
            </div>
          </div>
        )}

        {/* Message */}
        <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
          <p className="mb-1 text-xs uppercase tracking-wider text-white/40">Detected content</p>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{alert.message}</p>
        </div>

        {/* AI Explanation */}
        {alert.ai_explanation && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-sky-300">
              <Sparkles className="h-3.5 w-3.5" /> AI Explanation
            </div>
            <p className="text-sm text-white/80">{alert.ai_explanation}</p>
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Recommended Actions
            </div>
            <ul className="space-y-2">
              {recs.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Evidence</p>
            <ul className="space-y-1 text-xs text-white/70">
              {evidence.map((e, i) => <li key={i} className="rounded bg-white/5 px-2 py-1 font-mono">{typeof e === "string" ? e : JSON.stringify(e)}</li>)}
            </ul>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/40">Timeline</p>
          <div className="relative space-y-4">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
            {timeline.map((t, i) => {
              const I = t.icon;
              return (
                <div key={i} className="relative flex items-start gap-3">
                  <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 ring-1 ring-white/10">
                    <I className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">{t.label}</p>
                    <p className="text-[11px] text-white/40">{new Date(t.time).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Ban className="mr-2 h-4 w-4" />Block</Button>
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Check className="mr-2 h-4 w-4" />Mark Safe</Button>
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"><FileText className="mr-2 h-4 w-4" />Report to CERT-In</Button>
          <Button variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"><PhoneCall className="mr-2 h-4 w-4" />Call 1930</Button>
        </div>
      </div>
    </ScrollArea>
  );
}

export default Alerts;
