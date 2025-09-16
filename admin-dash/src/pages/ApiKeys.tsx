import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProjectManagementPanel } from "@/components/dashboard/panels/ProjectManagementPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ApiKeys = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className=""
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold gradient-text">API Key Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor your API keys and their usage
          </p>
        </div>

        <ProjectManagementPanel />
      </div>
    </DashboardLayout>
  );
};

export default ApiKeys;