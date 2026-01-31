import { AlertTriangle, TrendingUp, Sparkles, ArrowRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
                <DialogTitle className="text-xl font-semibold">Action Center</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-4">
                  {actions.map((action, index) => {
                    const PopoutIcon = iconMap[action.type];
                    return (
                      <div
                        key={index}
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
