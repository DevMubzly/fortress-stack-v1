import { Activity, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ActivityLog {
  id: string;
  timestamp: string;
  key: string;
  prompt: string;
  response: string;
  status: "success" | "error" | "pending";
  latency: number;
}

const mockLogs: ActivityLog[] = [
  {
    id: "req_1",
    timestamp: "2024-01-15 14:30:25",
    key: "Production",
    prompt: "Generate a summary of the quarterly financial report...",
    response: "Based on the quarterly financial report, the company has shown...",
    status: "success",
    latency: 125
  },
  {
    id: "req_2", 
    timestamp: "2024-01-15 14:29:18",
    key: "Development",
    prompt: "Translate the following text to Spanish: Hello world...",
    response: "Hola mundo...",
    status: "success",
    latency: 89
  },
  {
    id: "req_3",
    timestamp: "2024-01-15 14:28:45",
    key: "Production",
    prompt: "Create a product description for a new smartphone...",
    response: "Error: Rate limit exceeded",
    status: "error",
    latency: 0
  },
  {
    id: "req_4",
    timestamp: "2024-01-15 14:27:12",
    key: "Testing",
    prompt: "Write a Python function to calculate fibonacci sequence...",
    response: "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    status: "success",
    latency: 156
  },
  {
    id: "req_5",
    timestamp: "2024-01-15 14:26:33",
    key: "Production",
    prompt: "Analyze customer sentiment from reviews...",
    response: "",
    status: "pending",
    latency: 0
  }
];

export function ActivityLogsPanel() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-success/10 text-success">Success</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <Card className="card-gradient shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Last 20 requests and their status
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Export Logs
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">
                  {log.timestamp}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{log.key}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-sm" title={log.prompt}>
                    {truncateText(log.prompt, 40)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    {getStatusBadge(log.status)}
                  </div>
                </TableCell>
                <TableCell>
                  {log.latency > 0 ? `${log.latency}ms` : "-"}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                        <DialogDescription>
                          Full request and response details for {log.id}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Request Info</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Timestamp:</span>
                              <p className="font-mono">{log.timestamp}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">API Key:</span>
                              <p>{log.key}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <p>{getStatusBadge(log.status)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Latency:</span>
                              <p>{log.latency > 0 ? `${log.latency}ms` : "-"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Prompt</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">{log.prompt}</pre>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Response</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <pre className="text-sm whitespace-pre-wrap">
                              {log.response || "No response available"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}