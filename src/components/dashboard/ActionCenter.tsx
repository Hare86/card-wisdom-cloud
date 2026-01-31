import { AlertTriangle, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Action {
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  actionLabel?: string;
}

interface ActionCenterProps {
  actions: Action[];
}

export function ActionCenter({ actions }: ActionCenterProps) {
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

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Action Center</h3>
        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
          {actions.length} items
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = iconMap[action.type];
          return (
            <div
              key={index}
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
      </div>
    </div>
  );
}
