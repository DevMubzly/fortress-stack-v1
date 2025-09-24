import { useEffect, useState } from "react";
import { AlertTriangle, Clock, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export function UsageMetricsPanel() {
  const [requestsData, setRequestsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [yesterdayTotal, setYesterdayTotal] = useState(0);

  const [latencyData, setLatencyData] = useState([]);
  const [p95, setP95] = useState(0);
  const [loadingLatency, setLoadingLatency] = useState(true);

  const [tokensPerKey, setTokensPerKey] = useState([]);
  const [errorRate, setErrorRate] = useState({ percent: 0, count: 0 });

  // Fetch request trends
  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/admin/stats/requests/24h", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setRequestsData(Array.isArray(data.points) ? data.points : []);
        setTodayTotal(data.today_total || 0);
        setYesterdayTotal(data.yesterday_total || 0);
      } catch {
        setRequestsData([]);
        setTodayTotal(0);
        setYesterdayTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchTrends();
  }, []);

  // Fetch latency distribution
  useEffect(() => {
    async function fetchLatency() {
      setLoadingLatency(true);
      try {
        const res = await fetch("http://localhost:5000/admin/stats/latency/distribution", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch latency");
        const data = await res.json();
        setLatencyData(Array.isArray(data.latency_data) ? data.latency_data : []);
        setP95(data.p95 || 0);
      } catch {
        setLatencyData([]);
        setP95(0);
      } finally {
        setLoadingLatency(false);
      }
    }
    fetchLatency();
  }, []);

  // Fetch tokens per key and error rate
  useEffect(() => {
    async function fetchTokensAndErrors() {
      try {
        const res = await fetch("http://localhost:5000/admin/stats/tokens-per-key", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch tokens");
        const data = await res.json();
        setTokensPerKey(Array.isArray(data.tokens_per_key) ? data.tokens_per_key : []);
        setErrorRate({
          percent: data.error_rate_percent || 0,
          count: data.error_count || 0
        });
      } catch {
        setTokensPerKey([]);
        setErrorRate({ percent: 0, count: 0 });
      }
    }
    fetchTokensAndErrors();
  }, []);

  // Calculate percentage change
  const percentChange = yesterdayTotal === 0
    ? todayTotal === 0 ? 0 : 100
    : ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Request Trends */}
      <Card className="card-gradient shadow-card lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Request Trends</CardTitle>
                <CardDescription>Total requests over the last 24 hours</CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={Number(percentChange) >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
            >
              {Number(percentChange) >= 0 ? "+" : ""}
              {percentChange}% from yesterday
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading trends...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={requestsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Latency */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>Request Latency Distribution</CardTitle>
              <CardDescription>
                P95: {loadingLatency ? "..." : `${p95}ms`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loadingLatency ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading latency...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tokens Per Key */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle>Token Usage by Key</CardTitle>
              <CardDescription>Total tokens processed</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokensPerKey.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gradient-primary rounded-full"></div>
                  <span className="font-medium">{item.key}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{item.tokens.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">tokens</div>
                </div>
              </div>
            ))}
          </div>
          {/* Error Count */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Error Rate</span>
              </div>
              <Badge variant="destructive" className="bg-destructive/10">
                {errorRate.percent}% ({errorRate.count} errors)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}