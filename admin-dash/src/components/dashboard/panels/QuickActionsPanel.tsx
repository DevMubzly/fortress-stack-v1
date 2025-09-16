import { RotateCw, Download, RefreshCw, AlertTriangle, Server, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  variant: "default" | "warning" | "destructive";
  disabled?: boolean;
}

export function QuickActionsPanel() {
  const restartTGI = () => {
    toast({
      title: "Restarting TGI Service",
      description: "The TGI model server is being restarted. This may take a few minutes.",
    });
  };

  const rotateKeys = () => {
    toast({
      title: "Rotating API Keys",
      description: "All active API keys are being rotated for security.",
      variant: "destructive",
    });
  };

  const exportLogs = () => {
    toast({
      title: "Exporting Logs",
      description: "Usage logs are being prepared for download in CSV format.",
    });
  };

  const refreshMetrics = () => {
    toast({
      title: "Refreshing Metrics",
      description: "All dashboard metrics have been updated with the latest data.",
    });
  };

  const quickActions: QuickAction[] = [
    {
      title: "Restart TGI Service",
      description: "Restart the TGI model server to resolve issues",
      icon: Server,
      action: restartTGI,
      variant: "warning"
    },
    {
      title: "Rotate All Keys",
      description: "Generate new API keys for security",
      icon: Key,
      action: rotateKeys,
      variant: "destructive"
    },
    {
      title: "Export Usage Logs",
      description: "Download logs in CSV/JSON format",
      icon: Download,
      action: exportLogs,
      variant: "default"
    },
    {
      title: "Refresh Metrics",
      description: "Update all dashboard data",
      icon: RefreshCw,
      action: refreshMetrics,
      variant: "default"
    }
  ];

  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case "warning":
        return "outline";
      case "destructive":
        return "destructive";
      default:
        return "default";
    }
  };

  const getIconColor = (variant: string) => {
    switch (variant) {
      case "warning":
        return "text-warning";
      case "destructive":
        return "text-destructive";
      default:
        return "text-primary";
    }
  };

  return (
    <Card className="card-gradient shadow-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
            <RotateCw className="h-5 w-5 text-warning" />
          </div>
          <div>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Administrative tools and shortcuts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            
            if (action.variant === "destructive") {
              return (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <Button
                      variant={getButtonVariant(action.variant)}
                      className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                      disabled={action.disabled}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Icon className={`h-5 w-5 ${getIconColor(action.variant)}`} />
                        <span className="font-semibold">{action.title}</span>
                        {action.variant === "destructive" && (
                          <Badge className="bg-destructive/10 text-destructive ml-auto">
                            Danger
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {action.description}
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Confirm {action.title}
                      </DialogTitle>
                      <DialogDescription>
                        This is a destructive action that cannot be undone. Are you sure you want to {action.title.toLowerCase()}?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline">Cancel</Button>
                      <Button 
                        variant="destructive"
                        onClick={action.action}
                      >
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            }
            
            return (
              <Button
                key={index}
                variant={getButtonVariant(action.variant)}
                className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                onClick={action.action}
                disabled={action.disabled}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={`h-5 w-5 ${getIconColor(action.variant)}`} />
                  <span className="font-semibold">{action.title}</span>
                  {action.variant === "warning" && (
                    <Badge className="bg-warning/10 text-warning ml-auto">
                      Caution
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {action.description}
                </span>
              </Button>
            );
          })}
        </div>

        {/* System Status */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-glow"></div>
              <span className="text-sm font-medium">System Status</span>
            </div>
            <Badge className="bg-success/10 text-success">
              All Services Operational
            </Badge>
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}