import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Sparkles, ArrowRight, Maximize2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Action {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  cardId?: string | null;
}

interface ActionCenterProps {
  selectedCardId?: string | null;
  selectedCardName?: string;
}

// Map alert_type from database to our display types
const alertTypeMap: Record<string, "warning" | "info" | "success"> = {
  expiring_points: "warning",
  milestone: "success",
  new_partner: "info",
  promo: "info",
  security: "warning",
  recommendation: "success",
};

// Map alert_type to action labels
const actionLabelMap: Record<string, string> = {
  expiring_points: "View Options",
  milestone: "Claim Bonus",
  new_partner: "Learn More",
  promo: "View Offer",
  security: "Review",
  recommendation: "Apply",
};

export function ActionCenter({ selectedCardId, selectedCardName }: ActionCenterProps) {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const iconMap = {
    warning: AlertTriangle,
    info: TrendingUp,
    success: Sparkles,
  };

  const colorMap = {
    warning: "text-warning bg-warning/20",
    info: "text-info bg-info/20",
    success: "text-primary bg-primary/20",
  };

  useEffect(() => {
    if (user) {
      fetchActions();
    }
  }, [user, selectedCardId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      // Build query - get actions for selected card OR general actions (no card_id)
      let query = supabase
        .from("user_alerts")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      // If a card is selected, get card-specific + general alerts
      // If no card selected, get all alerts
      if (selectedCardId) {
        query = query.or(`card_id.eq.${selectedCardId},card_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedActions: Action[] = (data || []).map((alert) => ({
        id: alert.id,
        type: alertTypeMap[alert.alert_type] || "info",
        title: alert.title,
        description: alert.description || "",
        actionLabel: actionLabelMap[alert.alert_type] || "View",
        actionUrl: alert.action_url,
        cardId: alert.card_id,
      }));

      setActions(mappedActions);
    } catch (error) {
      console.error("Error fetching actions:", error);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Action Center</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Action Center</h3>
          {selectedCardName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing for {selectedCardName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
            {actions.length} items
          </span>
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
                <DialogTitle className="text-xl font-semibold">
                  Action Center
                  {selectedCardName && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      • {selectedCardName}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4">
                {actions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No pending actions for this card
                  </p>
                ) : (
                  <div className="space-y-4">
                    {actions.map((action) => {
                      const PopoutIcon = iconMap[action.type];
                      return (
                        <div
                          key={action.id}
                          className="flex items-start gap-4 p-5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer"
                        >
                          <div className={`p-3 rounded-lg ${colorMap[action.type]}`}>
                            <PopoutIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base">{action.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {action.description}
                            </p>
                            {!action.cardId && (
                              <span className="text-xs text-muted-foreground/60 mt-1 inline-block">
                                Applies to all cards
                              </span>
                            )}
                          </div>
                          {action.actionLabel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-sm text-primary hover:bg-primary/10 group-hover:translate-x-1 transition-transform"
                            >
                              {action.actionLabel}
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {actions.length === 0 ? (
        <p className="text-center text-muted-foreground py-4 text-sm">
          No pending actions
        </p>
      ) : (
        <div className="space-y-3">
          {actions.slice(0, 3).map((action) => {
            const Icon = iconMap[action.type];
            return (
              <div
                key={action.id}
                className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer"
              >
                <div className={`p-2 rounded-lg ${colorMap[action.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                </div>
                {action.actionLabel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:bg-primary/10 group-hover:translate-x-1 transition-transform"
                  >
                    {action.actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
          {actions.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{actions.length - 3} more actions
            </p>
          )}
        </div>
      )}
    </div>
  );
}
