import {
  BarChart3,
  Key,
  Activity,
  Settings,
  Cpu,
  Shield,
  LineChart,
  CloudLightning
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

const navigationItems = [
  { title: "Overview", url: "/dashboard", icon: BarChart3 },
  { title: "API Keys", url: "/dashboard/api-keys", icon: Key },
  { title: "Model Hub (being implemented)", url: "/dashboard/model-hub", icon: Cpu },
  { title: " Model Fine-Tuning", url: "/dashboard/training", icon: LineChart },
  { title: "System Health", url: "/dashboard/system-health", icon: Shield },
  { title: "Usage & Monitoring", url: "/dashboard/usage", icon: Activity },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [companyName, setCompanyName] = useState("Company");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("company");
      if (raw) {
        const company = JSON.parse(raw);
        if (company?.name) {
          setCompanyName(company.name);
        }
      }
    } catch {
      console.log("Error fetching company name");
    }
  }, []);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };

  return (
    <aside className="w-72 p-0 sticky top-0 h-screen border-r border-border/30 flex flex-col">
      <Card className="shadow-none h-full bg-transparent">
        <CardContent className="p-0 h-full flex flex-col">
          {/* Company Header */}
          <div className="flex flex-col">
            <div className="pt-[9px] pb-[9px] flex items-center gap-4 pl-12">
              <div className="w-12 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <CloudLightning className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-xl gradient-text">{companyName}</h2>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
            {/* Divider line aligned with header */}
            <div className="border-b mx-8" />
          </div>
          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            {navigationItems.map((item) => {
              const active = isActive(item.url);
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-4 px-5 py-3 rounded-lg font-code transition-all duration-200 text-base
                    ${active
                      ? "bg-primary/10 text-primary border border-primary/30 shadow-md"
                      : "hover:bg-blue-50 text-gray-600 hover:text-primary"
                    }`}
                >
                  <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-primary" : "text-gray-400 group-hover:text-primary"}`} />
                  <span className="font-semibold">{item.title}</span>
                </NavLink>
              );
            })}
          </nav>
          {/* Footer */}
          <div className="p-6 border-t border-border/30 text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}