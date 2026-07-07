import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Alert {
  id: string;
  user_id: string;
  alert_type: string;
  severity: string;
  message: string;
  is_read: boolean;
  created_at: string;
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
