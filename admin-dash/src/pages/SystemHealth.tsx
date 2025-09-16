import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SystemHealthPanel } from "@/components/dashboard/panels/SystemHealthPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SystemHealth = () => {
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
          <h1 className="text-3xl font-bold gradient-text">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system performance and resource utilization
          </p>
        </div>

        <SystemHealthPanel />
      </div>
    </DashboardLayout>
  );
};

export default SystemHealth;