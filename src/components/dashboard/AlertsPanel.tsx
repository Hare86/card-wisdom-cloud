import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, Info, X, Loader2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  priority: string;
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const alertIcons: Record<string, React.ReactNode> = {
  expiring_points: <AlertTriangle className="w-4 h-4" />,
  milestone: <CheckCircle2 className="w-4 h-4" />,
  new_partner: <Info className="w-4 h-4" />,
  promo: <Bell className="w-4 h-4" />,
  security: <AlertTriangle className="w-4 h-4" />,
};

export function AlertsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("user_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from("user_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await supabase.from("user_alerts").delete().eq("id", alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast({ title: "Alert dismissed" });
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Alerts
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                <Bell className="w-5 h-5 text-primary" />
                All Alerts
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No alerts at this time
                </p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        alert.is_read
                          ? "bg-muted/30 border-border/50"
                          : "bg-card border-primary/30"
                      )}
                      onClick={() => !alert.is_read && markAsRead(alert.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg", priorityColors[alert.priority])}>
                            {alertIcons[alert.alert_type] || <Bell className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className={cn("font-medium", !alert.is_read && "text-foreground")}>
                              {alert.title}
                            </p>
                            {alert.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {alert.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground/60 mt-2">
                              {new Date(alert.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissAlert(alert.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No alerts at this time
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  alert.is_read
                    ? "bg-muted/30 border-border/50"
                    : "bg-card border-primary/30"
                )}
                onClick={() => !alert.is_read && markAsRead(alert.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-lg", priorityColors[alert.priority])}>
                      {alertIcons[alert.alert_type] || <Bell className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={cn("font-medium text-sm", !alert.is_read && "text-foreground")}>
                        {alert.title}
                      </p>
                      {alert.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
