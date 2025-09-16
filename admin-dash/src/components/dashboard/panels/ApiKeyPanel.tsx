import { useState } from "react";
import { Key, Plus, RotateCw, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  status: "active" | "revoked";
  requests: number;
  tokens: number;
  latency: number;
}

const mockApiKeys: ApiKey[] = [
  {
    id: "key_1",
    name: "Production API",
    key: "sk-1234567890abcdef",
    created: "2024-01-15",
    status: "active",
    requests: 15420,
    tokens: 2840000,
    latency: 125
  },
  {
    id: "key_2", 
    name: "Development",
    key: "sk-abcdef1234567890",
    created: "2024-01-10",
    status: "active",
    requests: 3200,
    tokens: 580000,
    latency: 98
  },
  {
    id: "key_3",
    name: "Testing",
    key: "sk-fedcba0987654321",
    created: "2024-01-05",
    status: "revoked",
    requests: 1100,
    tokens: 150000,
    latency: 156
  }
];

export function ApiKeyPanel() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard",
    });
  };

  const createNewKey = () => {
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key: `sk-${Math.random().toString(36).substring(2)}`,
      created: new Date().toISOString().split('T')[0],
      status: "active",
      requests: 0,
      tokens: 0,
      latency: 0
    };
    
    setKeys(prev => [...prev, newKey]);
    setNewKeyName("");
    setIsCreateDialogOpen(false);
    
    toast({
      title: "API key created",
      description: `New API key "${newKeyName}" has been created successfully`,
    });
  };

  const revokeKey = (keyId: string) => {
    setKeys(prev => prev.map(key => 
      key.id === keyId ? { ...key, status: "revoked" as const } : key
    ));
    
    toast({
      title: "API key revoked",
      description: "The API key has been revoked and is no longer active",
      variant: "destructive",
    });
  };

  return (
    <Card className="card-gradient shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>API Key Management</CardTitle>
              <CardDescription>
                Manage your API keys and monitor usage
              </CardDescription>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary-dark glow">
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Enter a name for your new API key. Choose something descriptive.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createNewKey}
                    disabled={!newKeyName.trim()}
                    className="bg-gradient-primary"
                  >
                    Create Key
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Avg Latency</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{apiKey.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {showKeys[apiKey.id] ? apiKey.key : "sk-••••••••••••••••"}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={apiKey.status === "active" ? "default" : "destructive"}
                    className={apiKey.status === "active" ? "bg-success/10 text-success" : ""}
                  >
                    {apiKey.status}
                  </Badge>
                </TableCell>
                <TableCell>{apiKey.requests.toLocaleString()}</TableCell>
                <TableCell>{apiKey.tokens.toLocaleString()}</TableCell>
                <TableCell>{apiKey.latency}ms</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => revokeKey(apiKey.id)}
                      disabled={apiKey.status === "revoked"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}