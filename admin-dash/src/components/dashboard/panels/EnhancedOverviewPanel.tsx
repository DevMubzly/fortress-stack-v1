import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Clock, 
  Key, 
  Cpu, 
  Activity, 
  Building2,
  Globe,
  Shield,
  Database,
  Server
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useEffect, useMemo, useState } from "react";

type Health = {
  ok: boolean;
  uptime_seconds: number;
  system: { cpu_percent: number; memory_percent: number; free_memory_gb: number };
  model_server: { url: string; ok: boolean; latency_ms: number | null };
  db?: { ok: boolean };
};

type SimpleStatus = "OK" | "Slow" | "Down" | "Checking";

function statusStyles(status: SimpleStatus) {
  switch (status) {
    case "OK":
      return { box: "bg-green-50", dot: "bg-green-500", title: "text-green-800", sub: "text-green-600" };
    case "Slow":
      return { box: "bg-yellow-50", dot: "bg-yellow-500", title: "text-yellow-800", sub: "text-yellow-600" };
    case "Down":
      return { box: "bg-red-50", dot: "bg-red-500", title: "text-red-800", sub: "text-red-600" };
    default:
      return { box: "bg-muted", dot: "bg-muted-foreground", title: "text-muted-foreground", sub: "text-muted-foreground" };
  }
}

type StatsSummary = {
  measured_at: number;
  uptime_seconds: number;
  projects: { total: number; added_last_30d: number };
  api_keys: { active: number; created_last_7d: number };
  requests: { total: number; last_30d: number };
};

export function EnhancedOverviewPanel() {
  const navigate = useNavigate();

  // Live stats state
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  // NEW: chart data state
  type ApiKeysStatusPoint = { name: string; value: number; color: string };
  type WeeklyReqPoint = { day: string; requests: number };

  const [apiKeysStatusData, setApiKeysStatusData] = useState<ApiKeysStatusPoint[]>([
    { name: "Active", value: 0, color: "#16a34a" },  // green-600
    { name: "Revoked", value: 0, color: "#ef4444" }, // red-500
  ]);
  const [weeklyRequestsData, setWeeklyRequestsData] = useState<WeeklyReqPoint[]>([]);
  const [chartsErr, setChartsErr] = useState<string | null>(null);

  // Load stats + refresh every 30s
  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/stats/summary", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as StatsSummary;
        if (alive) {
          setStats(json);
          setStatsErr(null);
        }
      } catch (e: any) {
        if (alive) setStatsErr(e?.message || "Failed to load stats");
      }
    };
    loadStats();
    const id = setInterval(loadStats, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // NEW: load chart data (every 60s)
  useEffect(() => {
    let alive = true;

    const loadApiKeysStatus = async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/stats/apikeys/status", { credentials: "include" });
        if (!res.ok) {
          // try to show a clear message
          let msg = "";
          try { msg = await res.text(); } catch {}
          throw new Error(msg || `HTTP ${res.status}`);
        }
        const json = await res.json(); // { active, revoked, total }
        if (!alive) return;
        setApiKeysStatusData([
          { name: "Active", value: Number(json.active ?? 0), color: "#16a34a" },
          { name: "Revoked", value: Number(json.revoked ?? 0), color: "#ef4444" },
        ]);
        setChartsErr(null);
      } catch (e: any) {
        if (alive) setChartsErr(e?.message || "Failed to load chart data");
        // Keep a neutral placeholder so the chart still renders
        setApiKeysStatusData([
          { name: "Active", value: 0, color: "#16a34a" },
          { name: "Revoked", value: 0, color: "#ef4444" },
        ]);
      }
    };

    const loadWeeklyRequests = async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/stats/requests/weekly", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!alive) return;
        const fmt = (d: string) =>
          new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" })
            .format(new Date(d + "T00:00:00Z"));
        setWeeklyRequestsData((json.days ?? []).map((it: any) => ({ day: fmt(it.date), requests: Number(it.count ?? 0) })));
        setChartsErr(null);
      } catch (e: any) {
        if (alive) setChartsErr(e?.message || "Failed to load chart data");
      }
    };

    loadApiKeysStatus();
    loadWeeklyRequests();
    const id = setInterval(() => { loadApiKeysStatus(); loadWeeklyRequests(); }, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // System Status state
  const [health, setHealth] = useState<Health | null>(null);
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  // System health and auth effects
  useEffect(() => {
    let alive = true;
    const loadHealth = async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/system/health", { credentials: "include" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as Health;
        if (alive) setHealth(json);
      } catch {
        if (alive) setHealth(null);
      }
    };
    const loadAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/auth/verify", { credentials: "include" });
        if (!res.ok) throw new Error();
        if (alive) setAuthOk(true);
      } catch {
        if (alive) setAuthOk(false);
      }
    };
    loadHealth();
    loadAuth();
    const id = setInterval(() => { loadHealth(); loadAuth(); }, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const systemStatuses = useMemo(() => {
    // Defaults while checking
    if (!health) {
      return [
        { name: "API Gateway", status: "Checking" as SimpleStatus, subtitle: "Checking" },
        { name: "Database", status: "Checking" as SimpleStatus, subtitle: "Checking" },
        { name: "Authentication", status: "Checking" as SimpleStatus, subtitle: "Checking" },
      ];
    }

    // API Gateway: infer from CPU/RAM load (simple rule)
    const cpu = health.system.cpu_percent ?? 0;
    const mem = health.system.memory_percent ?? 0;
    const gwStatus: SimpleStatus = (cpu >= 90 || mem >= 90) ? "Slow" : "OK";
    const gwSubtitle = gwStatus === "OK" ? "Operational" : "High load";

    // Database: from backend health
    const dbStatus: SimpleStatus = health.db?.ok ? "OK" : "Down";
    const dbSubtitle = dbStatus === "OK" ? "Operational" : "Unavailable";

    // Auth: from /auth/verify
    const authStatus: SimpleStatus = authOk == null ? "Checking" : authOk ? "OK" : "Down";
    const authSubtitle =
      authStatus === "OK" ? "Operational" : authStatus === "Down" ? "Unavailable" : "Checking";

    return [
      { name: "API Gateway", status: gwStatus, subtitle: gwSubtitle },
      { name: "Database", status: dbStatus, subtitle: dbSubtitle },
      { name: "Authentication", status: authStatus, subtitle: authSubtitle },
    ];
  }, [health, authOk]);

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const dynamicStatsCards = useMemo(() => {
    const now = Date.now() / 1000;
    const updatedAgo = stats ? Math.max(0, Math.round(now - stats.measured_at)) : null;
    const updatedSuffix = updatedAgo != null ? `updated ${updatedAgo}s ago` : "loading…";

    return [
      {
        title: "Total Projects",
        value: stats ? String(stats.projects.total) : "—",
        change: stats ? `+${stats.projects.added_last_30d} last 30d • ${updatedSuffix}` : updatedSuffix,
        trend: "up",
        icon: Building2,
        color: "text-blue-600",
      },
      {
        title: "Active API Keys",
        value: stats ? String(stats.api_keys.active) : "—",
        change: stats ? `+${stats.api_keys.created_last_7d} last 7d • ${updatedSuffix}` : updatedSuffix,
        trend: "up",
        icon: Key,
        color: "text-green-600",
      },
      {
        title: "Total Requests",
        value: stats ? stats.requests.total.toLocaleString() : "—",
        change: stats ? `+${stats.requests.last_30d.toLocaleString()} last 30d • ${updatedSuffix}` : updatedSuffix,
        trend: "up",
        icon: Globe,
        color: "text-purple-600",
      },
      {
        title: "System Uptime",
        value: stats ? formatUptime(stats.uptime_seconds) : "—",
        change: stats ? updatedSuffix : "loading…",
        trend: "up",
        icon: Shield,
        color: "text-emerald-600",
      },
    ];
  }, [stats]);

  // Quick Access Cards definition
  const quickAccessCards = [
  {
    title: "API Keys",
    description: "Manage project API keys",
    icon: Key,
    path: "/dashboard/api-keys",
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "System Health",
    description: "Monitor infrastructure",
    icon: Cpu,
    path: "/dashboard/system-health",
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Usage & Monitoring",
    description: "Track activity & metrics",
    icon: Activity,
    path: "/dashboard/usage",
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Settings",
    description: "User & system settings",
    icon: Database,
    path: "/dashboard/settings",
    color: "bg-orange-50 text-orange-600",
  },
];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicStatsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-muted/20 ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {stat.change}
                  </Badge>
                </div>
                {statsErr && (stat.title === "Total Projects" || stat.title === "Active API Keys") && (
                  <div className="mt-2 text-xs text-destructive">{statsErr}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys Status Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apiKeysStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {apiKeysStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {apiKeysStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
            {chartsErr && <div className="mt-3 text-xs text-destructive">{chartsErr}</div>}
          </CardContent>
        </Card>

        {/* Weekly Requests Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly API Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyRequestsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="requests" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessCards.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.title}
                  type="button"
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start text-left hover:shadow-md hover:bg-blue-50 transition-all duration-200"
                  onClick={() => navigate(item.path)}
                  aria-label={item.title}
                  title={item.description}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemStatuses.map((item) => {
              const styles = statusStyles(item.status);
              return (
                <div key={item.name} className={`flex items-center justify-between p-4 rounded-lg ${styles.box}`}>
                  <div>
                    <p className={`text-sm font-medium ${styles.title}`}>{item.name}</p>
                    <p className={`text-xs ${styles.sub}`}>
                      {item.status}{item.subtitle ? ` — ${item.subtitle}` : ""}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${styles.dot}`}></div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}