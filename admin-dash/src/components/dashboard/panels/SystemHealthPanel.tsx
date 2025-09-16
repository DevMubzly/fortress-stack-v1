import { useEffect, useMemo, useState } from "react";
import { Server, Cpu, HardDrive, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Health = {
  ok: boolean;
  uptime_seconds: number;
  system: { cpu_percent: number; memory_percent: number; free_memory_gb: number };
  model_server: { url: string; ok: boolean; latency_ms: number | null };
  db?: { ok: boolean };
};

interface SystemMetric {
  name: string;
  // value is used for progress (0–100 by default). If max is set, value is raw and normalized by max.
  value: number;
  unit: string; // display unit
  status: "healthy" | "warning" | "critical";
  icon: React.ElementType;
  display?: string; // optional display override
  max?: number; // optional scale for progress (e.g., latency ms -> 1000)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "healthy":
      return "text-success";
    case "warning":
      return "text-warning";
    case "critical":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "healthy":
      return <Badge className="bg-success/10 text-success">Healthy</Badge>;
    case "warning":
      return <Badge className="bg-warning/10 text-warning">Warning</Badge>;
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export function SystemHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/admin/system/health", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data: Health = await res.json();
      setHealth(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load system health");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // was 10000 (10s), now 15s
    return () => clearInterval(id);
  }, []);

  const metrics: SystemMetric[] = useMemo(() => {
    if (!health) {
      return [
        { name: "Model Server", value: 0, unit: "%", status: "warning", icon: Server, display: "Checking…" },
        { name: "Model Latency", value: 0, unit: "ms", status: "warning", icon: Activity, display: "—", max: 1000 },
        { name: "CPU Usage", value: 0, unit: "%", status: "warning", icon: Cpu },
        { name: "Memory Usage", value: 0, unit: "%", status: "warning", icon: HardDrive },
      ];
    }
    const cpu = health.system.cpu_percent ?? 0;
    const mem = health.system.memory_percent ?? 0;
    const latency = health.model_server.latency_ms ?? 0;
    // Normalize latency to 0..100 based on a 1000ms target window
    const latencyMax = 1000;
    const latencyPct = Math.max(0, Math.min(100, (latency / latencyMax) * 100));

    const modelStatus: SystemMetric["status"] = health.model_server.ok
      ? "healthy"
      : "critical";
    const latencyStatus: SystemMetric["status"] =
      latency === 0 ? "warning" : latency < 300 ? "healthy" : latency < 800 ? "warning" : "critical";
    const cpuStatus: SystemMetric["status"] = cpu < 70 ? "healthy" : cpu < 90 ? "warning" : "critical";
    const memStatus: SystemMetric["status"] = mem < 70 ? "healthy" : mem < 90 ? "warning" : "critical";

    return [
      {
        name: "Model Server",
        value: health.model_server.ok ? 100 : 0,
        unit: "%",
        status: modelStatus,
        icon: Server,
        display: health.model_server.ok ? "Online" : "Offline",
      },
      {
        name: "Model Latency",
        value: latencyPct,
        unit: "ms",
        status: latencyStatus,
        icon: Activity,
        display: health.model_server.latency_ms != null ? `${health.model_server.latency_ms} ms` : "—",
        max: 1000,
      },
      {
        name: "CPU Usage",
        value: cpu,
        unit: "%",
        status: cpuStatus,
        icon: Cpu,
        display: `${cpu}%`,
      },
      {
        name: "Memory Usage",
        value: mem,
        unit: "%",
        status: memStatus,
        icon: HardDrive,
        display: `${mem}%`,
      },
    ];
  }, [health]);

  const overallStatus =
    metrics.some((m) => m.status === "critical")
      ? "critical"
      : metrics.some((m) => m.status === "warning")
      ? "warning"
      : "healthy";

  return (
    <Card className="card-gradient shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                overallStatus === "healthy"
                  ? "bg-success/10"
                  : overallStatus === "warning"
                  ? "bg-warning/10"
                  : "bg-destructive/10"
              }`}
            >
              {overallStatus === "critical" ? (
                <AlertCircle className={`h-5 w-5 ${getStatusColor(overallStatus)}`} />
              ) : (
                <Server className={`h-5 w-5 ${getStatusColor(overallStatus)}`} />
              )}
            </div>
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time system monitoring and status</CardDescription>
            </div>
          </div>
          {getStatusBadge(overallStatus)}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 text-sm text-destructive">
            Failed to load health: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            // Normalize progress value 0..100 (if max provided, value already normalized above)
            const progressValue = Math.max(0, Math.min(100, metric.max ? (metric.value / metric.max) * 100 : metric.value));
            const endLabel = metric.max ? `${metric.max}${metric.unit}` : `100${metric.unit}`;
            return (
              <div key={metric.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${getStatusColor(metric.status)}`} />
                    <span className="font-medium text-sm">{metric.name}</span>
                  </div>
                  <span className="text-sm font-bold">
                    {metric.display ?? `${metric.value}${metric.unit}`}
                  </span>
                </div>

                <div className="space-y-2">
                  <Progress value={progressValue} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0{metric.unit}</span>
                    <span>{endLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {health ? `${(health.uptime_seconds / 3600).toFixed(1)}h` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">
                {health?.model_server.latency_ms != null ? `${health.model_server.latency_ms}ms` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Model Latency</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">
                {health ? `${health.system.free_memory_gb}GB` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Free Memory</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {health ? (health.ok ? <span className="text-success">All Systems</span> : <span className="text-warning">Degraded</span>) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}