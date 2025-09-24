import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UsageMetricsPanel } from "@/components/dashboard/panels/UsageMetricsPanel";
import { ActivityLogsPanel } from "@/components/dashboard/panels/ActivityLogsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UsageMonitoring = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Usage Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg text-muted-foreground mb-2">
            Coming soon.
          </div>
          <div className="text-sm text-muted-foreground">
            Usage metrics and analytics will be available here.
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
};

export default UsageMonitoring;