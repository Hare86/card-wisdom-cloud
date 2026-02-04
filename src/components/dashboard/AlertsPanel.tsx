import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/lazyClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle2, Info, X, Loader2, Maximize2, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  action_url: string | null;
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

// Action guidance based on alert type
const alertActionGuidance: Record<string, { action: string; buttonLabel: string; route?: string }> = {
  expiring_points: {
    action: "Redeem your points before they expire to avoid losing value",
    buttonLabel: "View Redemption Options",
    route: "/analytics",
  },
  milestone: {
    action: "You've earned a bonus! Click to claim your reward",
    buttonLabel: "Claim Bonus",
  },
  new_partner: {
    action: "Explore new transfer partner options for better redemption value",
    buttonLabel: "Explore Partners",
    route: "/transactions",
  },
  promo: {
    action: "Limited time offer - take advantage of this promotion",
    buttonLabel: "View Offer",
  },
  security: {
    action: "Review your account security settings immediately",
    buttonLabel: "Review Security",
  },
};

export function AlertsPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const sb = getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb
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
      const sb = getSupabaseClient();
      if (!sb) return;
      await sb
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

  const dismissAlert = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const sb = getSupabaseClient();
      if (!sb) return;
      await sb.from("user_alerts").delete().eq("id", alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast({ title: "Alert dismissed" });
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  const handleAlertClick = (alert: Alert) => {
    // Mark as read if not already
    if (!alert.is_read) {
      markAsRead(alert.id);
    }
    
    // Toggle expanded state to show action guidance
    setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
  };

  const handleActionClick = async (alert: Alert, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const guidance = alertActionGuidance[alert.alert_type];
    
    // Handle action based on alert type
    if (alert.action_url) {
      if (alert.action_url.startsWith("http")) {
        window.open(alert.action_url, "_blank");
      } else {
        navigate(alert.action_url);
      }
    } else if (guidance?.route) {
      navigate(guidance.route);
    } else if (alert.alert_type === "milestone") {
      // Show congratulations for milestone
      toast({
        title: "🎉 Congratulations!",
        description: `You've claimed: ${alert.title}. ${alert.description || ""}`,
        duration: 5000,
      });
      
      // Mark as read and remove
      const sb = getSupabaseClient();
      if (!sb) return;
      await sb
        .from("user_alerts")
        .update({ is_read: true })
        .eq("id", alert.id);
      
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } else {
      toast({
        title: "Action Noted",
        description: `We've recorded your interest in: ${alert.title}`,
      });
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const renderAlertItem = (alert: Alert, isExpanded: boolean, isCompact: boolean = false) => {
    const guidance = alertActionGuidance[alert.alert_type] || {
      action: "Click to view more details",
      buttonLabel: "View Details",
    };

    return (
      <div
        key={alert.id}
        className={cn(
          "rounded-lg border transition-all cursor-pointer group",
          alert.is_read
            ? "bg-muted/30 border-border/50 hover:border-border"
            : "bg-card border-primary/30 hover:border-primary/50",
          isCompact ? "p-3" : "p-4"
        )}
        onClick={() => handleAlertClick(alert)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("rounded-lg", priorityColors[alert.priority], isCompact ? "p-1.5" : "p-2")}>
              {alertIcons[alert.alert_type] || <Bell className={isCompact ? "w-4 h-4" : "w-5 h-5"} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn("font-medium", isCompact ? "text-sm" : "", !alert.is_read && "text-foreground")}>
                  {alert.title}
                </p>
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-90"
                )} />
              </div>
              {alert.description && (
                <p className={cn("text-muted-foreground mt-1", isCompact ? "text-xs" : "text-sm")}>
                  {alert.description}
                </p>
              )}
              <p className={cn("text-muted-foreground/60 mt-1", isCompact ? "text-xs" : "text-xs")}>
                {new Date(alert.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-destructive",
              isCompact ? "h-6 w-6" : "h-8 w-8"
            )}
            onClick={(e) => dismissAlert(alert.id, e)}
          >
            <X className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
        </div>

        {/* Expanded Action Section */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-start gap-3 bg-primary/5 rounded-lg p-3">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">What to do next:</p>
                <p className="text-sm text-muted-foreground mt-1">{guidance.action}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full mt-3"
              onClick={(e) => handleActionClick(alert, e)}
            >
              {guidance.buttonLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  };

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
              <DialogDescription>
                View all your credit card alerts and notifications
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No alerts at this time
                </p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => renderAlertItem(alert, expandedAlert === alert.id, false))}
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
            {alerts.map((alert) => renderAlertItem(alert, expandedAlert === alert.id, true))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
