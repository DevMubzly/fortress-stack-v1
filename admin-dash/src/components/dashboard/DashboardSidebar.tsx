import { 
  BarChart3, 
  Key, 
  Activity, 
  Settings, 
  Cpu,
  Shield,
  Download,
  CloudDownload,
  LineChart
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

const navigationItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "API Keys",
    url: "/dashboard/api-keys",
    icon: Key,
  },
  {
    title: "Model Hub",
    url: "/dashboard/model-hub",
    icon: Cpu,
  },
  {
    title: "Training and Fine-Tuning",
    url: "/dashboard/training",
    icon: LineChart,
  },
  {
    title: "System Health",
    url: "/dashboard/system-health",
    icon: Shield,
  },
  {
    title: "Usage & Monitoring",
    url: "/dashboard/usage",
    icon: Activity,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [companyName, setCompanyName] = useState("Company");

  useEffect (() => {
    try{
      const raw = localStorage.getItem("company");
      if (raw) {
        const company = JSON.parse(raw);
        if(company?.name) {
          setCompanyName(company.name);
        }
      }
    }catch{
      console.log("Error fetching company name");
    }
  }, [])

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 p-4 sticky top-0 h-screen">
      <Card className="card-gradient shadow-card">
        <CardContent className="p-0">
          {/* Company Header */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center glow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg gradient-text">{companyName}</h2>
                <p className="text-xs text-muted-foreground">Company Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}