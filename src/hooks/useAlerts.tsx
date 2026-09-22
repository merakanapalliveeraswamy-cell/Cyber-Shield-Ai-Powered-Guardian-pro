import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/40",
  low: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40",
};

const SeverityBadge = ({ severity }: { severity: string }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
      severityStyles[severity?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border"
    }`}
  >
    {severity || "info"}
  </span>
);

const notifyAlert = (alert: Alert) => {
  const body = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <span className="text-sm font-semibold">{alert.title || alert.alert_type}</span>
      </div>
      <p className="text-xs opacity-80 line-clamp-3">{alert.message}</p>
    </div>
  );
  const sev = (alert.severity || "").toLowerCase();
  if (sev === "critical" || sev === "high") toast.error(body, { duration: 8000 });
  else if (sev === "medium") toast.warning(body, { duration: 6000 });
  else toast(body, { duration: 5000 });
};

export interface Alert {
  id: string;
  user_id: string;
  alert_type: string;
  severity: string;
  message: string;
  is_read: boolean;
  created_at: string;
  title?: string | null;
  category?: string | null;
  confidence?: number | null;
  risk_score?: number | null;
  status?: string | null;
  source?: string | null;
  device?: string | null;
  location?: string | null;
  evidence?: unknown;
  ai_explanation?: string | null;
  recommendations?: unknown;
  updated_at?: string;
}

const MAX_RETRY_DELAY_MS = 30_000;
const BASE_RETRY_DELAY_MS = 1_000;

export const useAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "error"
  >("idle");

  const retryAttemptsRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[useAlerts] Failed to fetch alerts:", error);
    } else if (data) {
      setAlerts(data as Alert[]);
      setUnreadCount(data.filter((a) => !a.is_read).length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    if (!user) return;

    cancelledRef.current = false;
    let currentChannel: ReturnType<typeof supabase.channel> | null = null;

    const clearRetryTimer = () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const scheduleReconnect = (reason: string) => {
      if (cancelledRef.current) return;
      const attempt = retryAttemptsRef.current;
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** attempt,
        MAX_RETRY_DELAY_MS
      );
      retryAttemptsRef.current = attempt + 1;
      setRealtimeStatus("reconnecting");
      console.warn(
        `[useAlerts] Realtime ${reason}. Reconnecting in ${delay}ms (attempt ${attempt + 1})`
      );
      clearRetryTimer();
      retryTimeoutRef.current = setTimeout(() => {
        if (!cancelledRef.current) connect();
      }, delay);
    };

    const teardown = async (ch: ReturnType<typeof supabase.channel> | null) => {
      if (!ch) return;
      try {
        await supabase.removeChannel(ch);
      } catch (err) {
        console.error("[useAlerts] Error removing channel:", err);
      }
    };

    const connect = () => {
      if (cancelledRef.current) return;
      setRealtimeStatus((s) => (s === "reconnecting" ? s : "connecting"));

      // Refetch on reconnect to catch anything missed while disconnected
      if (retryAttemptsRef.current > 0) fetchAlerts();

      const topic = `alerts-realtime-${user.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      let channel: ReturnType<typeof supabase.channel>;
      try {
        channel = supabase
          .channel(topic)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "alerts",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newAlert = payload.new as Alert;
              setAlerts((prev) =>
                prev.some((a) => a.id === newAlert.id) ? prev : [newAlert, ...prev]
              );
              setUnreadCount((prev) => prev + 1);
            }
          )
          .subscribe((status, err) => {
            if (cancelledRef.current) return;
            switch (status) {
              case "SUBSCRIBED":
                retryAttemptsRef.current = 0;
                setRealtimeStatus("connected");
                break;
              case "CHANNEL_ERROR":
              case "TIMED_OUT":
                setRealtimeStatus("error");
                if (err) console.error("[useAlerts] Channel error:", err);
                teardown(channel).then(() => scheduleReconnect(status));
                break;
              case "CLOSED":
                if (!cancelledRef.current) {
                  teardown(channel).then(() => scheduleReconnect("closed"));
                }
                break;
            }
          });
        currentChannel = channel;
      } catch (err) {
        console.error("[useAlerts] Failed to initialize channel:", err);
        setRealtimeStatus("error");
        scheduleReconnect("init-failed");
      }
    };

    connect();

    return () => {
      cancelledRef.current = true;
      clearRetryTimer();
      retryAttemptsRef.current = 0;
      setRealtimeStatus("idle");
      teardown(currentChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id);
    if (error) {
      console.error("[useAlerts] markRead failed:", error);
      return;
    }
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .in("id", unreadIds);
    if (error) {
      console.error("[useAlerts] markAllRead failed:", error);
      return;
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    setUnreadCount(0);
  };

  return {
    alerts,
    unreadCount,
    loading,
    realtimeStatus,
    markRead,
    markAllRead,
    refetch: fetchAlerts,
  };
};
