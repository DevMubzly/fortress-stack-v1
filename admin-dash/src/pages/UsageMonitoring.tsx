import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UsageMetricsPanel } from "@/components/dashboard/panels/UsageMetricsPanel";
import { ActivityLogsPanel } from "@/components/dashboard/panels/ActivityLogsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UsageMonitoring = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold gradient-text">Usage & Monitoring</h1>
          <p className="text-muted-foreground">
            Track API usage metrics and monitor system activity
          </p>
        </div>

        <div className="space-y-6">
          <UsageMetricsPanel />
          <ActivityLogsPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsageMonitoring;