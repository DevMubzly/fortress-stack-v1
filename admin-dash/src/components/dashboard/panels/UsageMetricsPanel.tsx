import { TrendingUp, Zap, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const requestsData = [
  { time: "00:00", requests: 145 },
  { time: "04:00", requests: 89 },
  { time: "08:00", requests: 324 },
  { time: "12:00", requests: 567 },
  { time: "16:00", requests: 432 },
  { time: "20:00", requests: 298 },
];

const latencyData = [
  { range: "0-50ms", count: 1240 },
  { range: "50-100ms", count: 2350 },
  { range: "100-200ms", count: 1890 },
  { range: "200-500ms", count: 456 },
  { range: "500ms+", count: 89 },
];

const tokensPerKey = [
  { key: "Production", tokens: 2840000 },
  { key: "Development", tokens: 580000 },
  { key: "Testing", tokens: 150000 },
];

export function UsageMetricsPanel() {
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
            <Badge variant="outline" className="bg-success/10 text-success">
              +12.5% from yesterday
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
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
              <CardDescription>P95: 185ms</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
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
                0.02% (12 errors)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}