import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  project: string;
  key: string;
  createdAt: string;
  status: "active" | "revoked";
  requests: number;
  tokens: number;
  latency: number;
}

interface Project {
  id: string;
  name: string;
  company: string;
}

const mockProjects: Project[] = [
  { id: "1", name: "AI Assistant", company: "TechCorp" },
  { id: "2", name: "Data Analytics", company: "DataFlow Inc" },
  { id: "3", name: "Chat Platform", company: "Communication Co" },
  { id: "4", name: "Mobile App", company: "AppDev Studio" },
];

const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production Key",
    project: "AI Assistant",
    key: "sk-proj-1234567890abcdef",
    createdAt: "2024-01-15",
    status: "active",
    requests: 12450,
    tokens: 245892,
    latency: 120,
  },
  {
    id: "2",
    name: "Development Key",
    project: "Data Analytics",
    key: "sk-proj-abcdef1234567890",
    createdAt: "2024-01-10",
    status: "active",
    requests: 3250,
    tokens: 89234,
    latency: 95,
  },
  {
    id: "3",
    name: "Testing Key",
    project: "Chat Platform",
    key: "sk-proj-fedcba0987654321",
    createdAt: "2024-01-05",
    status: "revoked",
    requests: 1850,
    tokens: 45123,
    latency: 150,
  },
];

export function EnhancedApiKeyPanel() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard",
    });
  };

  const createNewKey = () => {
    const selectedProjectObj = mockProjects.find(p => p.id === selectedProject);
    if (!selectedProjectObj || !newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please select a project and enter a key name",
        variant: "destructive",
      });
      return;
    }

    const newKey = `sk-proj-${Math.random().toString(36).substring(2, 18)}`;
    const newApiKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName.trim(),
      project: selectedProjectObj.name,
      key: newKey,
      createdAt: new Date().toISOString().split('T')[0],
      status: "active",
      requests: 0,
      tokens: 0,
      latency: 0,
    };

    setApiKeys([...apiKeys, newApiKey]);
    setNewlyCreatedKey(newKey);
    setNewKeyName("");
    setSelectedProject("");
    
    toast({
      title: "API Key Created",
      description: `New API key "${newKeyName}" has been created successfully`,
    });
  };

  const revokeKey = (keyId: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === keyId ? { ...key, status: "revoked" as const } : key
    ));
    toast({
      title: "API Key Revoked",
      description: "The API key has been revoked and is no longer active",
    });
  };

  const formatKey = (key: string, isVisible: boolean) => {
    if (isVisible) return key;
    return `${key.substring(0, 12)}${'•'.repeat(20)}`;
  };

  const groupedKeys = apiKeys.reduce((acc, key) => {
    if (!acc[key.project]) {
      acc[key.project] = [];
    }
    acc[key.project].push(key);
    return acc;
  }, {} as Record<string, ApiKey[]>);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">API Key Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys organized by projects and companies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for a specific project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProjects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.company})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                {newlyCreatedKey && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Your new API key:</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-background rounded text-sm font-mono">
                        {newlyCreatedKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(newlyCreatedKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Make sure to copy this key now. You won't be able to see it again.
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setNewlyCreatedKey(null);
                    }}
                  >
                    {newlyCreatedKey ? "Done" : "Cancel"}
                  </Button>
                  {!newlyCreatedKey && (
                    <Button onClick={createNewKey}>
                      Create Key
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedKeys).map(([projectName, keys]) => (
            <div key={projectName} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-lg">{projectName}</h3>
                <Badge variant="outline" className="text-xs">
                  {keys.length} key{keys.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell className="font-medium">{apiKey.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {formatKey(apiKey.key, visibleKeys.has(apiKey.id))}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                            >
                              {visibleKeys.has(apiKey.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{apiKey.createdAt}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={apiKey.status === "active" ? "default" : "destructive"}
                          >
                            {apiKey.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{apiKey.requests.toLocaleString()}</TableCell>
                        <TableCell>{apiKey.tokens.toLocaleString()}</TableCell>
                        <TableCell>{apiKey.latency}ms</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey.key)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {apiKey.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeKey(apiKey.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}