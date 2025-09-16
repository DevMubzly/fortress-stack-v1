import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EnhancedOverviewPanel } from "@/components/dashboard/panels/EnhancedOverviewPanel";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <EnhancedOverviewPanel />
    </DashboardLayout>
  );
};

export default Dashboard;