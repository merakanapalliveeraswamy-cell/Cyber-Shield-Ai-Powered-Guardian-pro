import { Bell, Check, CheckCheck, ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { useNavigate } from "react-router-dom";

const severityIcon: Record<string, React.ElementType> = {
  high: ShieldAlert,
  medium: AlertTriangle,
  low: ShieldCheck,
};

const severityStyle: Record<string, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-success",
};

const NotificationBell = () => {
  const { alerts, unreadCount, markRead, markAllRead } = useAlerts();
  const navigate = useNavigate();
  const recent = alerts.slice(0, 8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((alert) => {
                const Icon = severityIcon[alert.severity] || Bell;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !alert.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severityStyle[alert.severity] || ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">{alert.alert_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!alert.is_read && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => markRead(alert.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/app/alerts")}>
            View all alerts
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
