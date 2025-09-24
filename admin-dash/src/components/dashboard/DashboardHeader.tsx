import { Bell, Settings, User, LogOut, Brain, ChevronDown, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

type Health = {
  ok: boolean;
  uptime_seconds: number;
  system: { cpu_percent: number; memory_percent: number; free_memory_gb: number };
  model_server: { url: string; ok: boolean; latency_ms: number | null };
  db?: { ok: boolean };
};

type Status = "healthy" | "warning" | "critical" | "checking";

function classifyStatus(h: Health | null): { status: Status; label: string } {
  if (!h) return { status: "checking", label: "Checking…" };
  if (!h.model_server.ok) return { status: "critical", label: "Model Offline" };

  const cpu = h.system.cpu_percent ?? 0;
  const mem = h.system.memory_percent ?? 0;
  const lat = h.model_server.latency_ms ?? 0;

  const critical = cpu >= 90 || mem >= 90 || lat >= 800;
  const warning = cpu >= 70 || mem >= 80 || lat >= 300;

  if (critical) return { status: "critical", label: "Partial Outage" };
  if (warning) return { status: "warning", label: "Degraded Performance" };
  return { status: "healthy", label: "All Systems Operational" };
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Admin User");
  const [health, setHealth] = useState<Health | null>(null);

  const notifications = [
    {
      id: 1,
      type: "success",
      title: "Model Ready",
      message: "TinyLlama is loaded and ready to use",
      time: "2 minutes ago"
    },
    {
      id: 2,
      type: "warning",
      title: "High CPU Usage",
      message: "CPU utilization is at 95%. Consider optimizing your workload",
      time: "15 minutes ago"
    },
    {
      id: 3,
      type: "info",
      title: "Training Complete",
      message: "Fine-tuning job #12 has completed successfully",
      time: "1 hour ago"
    },
    {
      id: 4,
      type: "info",
      title: "System Update",
      message: "Fortress AI platform updated to version 2.1.0",
      time: "3 hours ago"
    }
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/verify", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.user?.username) setUsername(data.user.username);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Poll system health
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/system/health", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data: Health = await res.json();
        if (alive) setHealth(data);
      } catch {
        if (alive) setHealth(null);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const { status, label } = useMemo(() => classifyStatus(health), [health]);
  const badgeClass =
    status === "healthy"
      ? "bg-success/10 text-success border-success/20"
      : status === "warning"
      ? "bg-warning/10 text-warning border-warning/20"
      : status === "critical"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-muted text-muted-foreground border-border";

  const badgeTitle = health
    ? `CPU: ${health.system.cpu_percent}% • Mem: ${health.system.memory_percent}% • Latency: ${health.model_server.latency_ms ?? "—"}ms`
    : "Loading…";

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Overview of Activities</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Dynamic Status Badge */}
        <Badge variant="outline" className={badgeClass} title={badgeTitle}>
          {label}
        </Badge>

        {/* Model Dropdown - Only TinyLlama */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-background"
              disabled
            >
              <Brain className="h-4 w-4" />
              <span className="hidden md:inline text-sm">TinyLlama</span>
              <span className="md:hidden text-sm">Model</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-background border shadow-lg z-50">
            <DropdownMenuLabel>Switch Model</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="cursor-not-allowed flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-bold">
              <Brain className="mr-2 h-4 w-4" />
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium">TinyLlama</span>
                <span className="text-xs text-muted-foreground">Currently loaded</span>
              </div>
              <CheckCircle className="h-4 w-4 text-success ml-2" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard/model-hub")}>
              <span className="text-sm text-muted-foreground">Manage models...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        {/* <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse-glow"></div>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-background border shadow-lg z-50">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <p className="text-sm text-muted-foreground">Recent system updates and alerts</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4 border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full text-sm text-muted-foreground">
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover> */}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="lg" className="flex items-center gap-2 hover:bg-blue-100 hover:text-black">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-background" />
              </div>
              <span className="hidden md:inline">{username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}