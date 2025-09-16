import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Copy, Plus, RefreshCw, Trash2, Building2, Key, Settings, Delete, Trash } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// add a lightweight secret cache (by key id). Less secure: visible to JS.
const SECRET_CACHE = "fs.keySecrets";
const getSecrets = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(SECRET_CACHE) || "{}"); } catch { return {}; }
};
const getSecret = (id: string) => getSecrets()[id];
const setSecret = (id: string, key: string) => {
  const s = getSecrets(); s[id] = key;
  try { localStorage.setItem(SECRET_CACHE, JSON.stringify(s)); } catch {}
};
const removeSecrets = (ids: string[]) => {
  const s = getSecrets(); ids.forEach(id => delete s[id]);
  try { localStorage.setItem(SECRET_CACHE, JSON.stringify(s)); } catch {}
};

interface Project {
  id: string;
  name: string;
  company: string;      // used in UI as "Department"
  description: string;
  createdAt: string;
  keyCount: number;
}

interface ApiKey {
  id: string;
  name: string;
  projectId: string;
  key: string;
  createdAt: string;
  status: "active" | "revoked";
  requests: number;
  tokens: number;
  latency: number;
  // extend ApiKey with optional prefix
  // interface ApiKey { id: string; name: string; projectId: string; key: string; ... }
  prefix?: string;
}

export function ProjectManagementPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]); // init empty
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  
  // Project creation state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    company: "",
    description: "",
  });

  // Key creation state
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    const confirmed = window.confirm(
      `Delete project "${selectedProject.name}"? This will remove its API keys and usage.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `http://localhost:5000/admin/project/${encodeURIComponent(selectedProject.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to delete project");

      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      setApiKeys(prev => prev.filter(k => k.projectId !== selectedProject.id));
      setSelectedProject(null);

      toast({ title: "Project deleted", description: "The project and its API keys were removed." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const createProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in project name",
        variant: "destructive",
      });
      return;
    }
  
    try {
      const res = await fetch("http://localhost:5000/admin/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newProject.name.trim(),
          department: newProject.company.trim(),
          description: newProject.description.trim() || undefined,
        }),
      });
  
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          (res.status === 409 ? "A project with the same name already exists" : "Failed to create project");
        throw new Error(msg);
      }
  
      // prefer backend fields; fall back to form values
      const companyName = (() => {
        try {
          const raw = localStorage.getItem("company");
          return raw ? JSON.parse(raw)?.name || "" : "";
        } catch {
          return "";
        }
      })();
  
      const project: Project = {
        id: String(data.project_id ?? data.id ?? Date.now()),
        name: data.name ?? newProject.name.trim(),
        company: data.department ?? newProject.company.trim(), // display in UI
        description: data.description ?? newProject.description.trim(),
        createdAt: (data.created_at
          ? new Date(data.created_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]),
        keyCount: 0,
      };
  
      setProjects((prev) => [...prev, project]);
      setNewProject({ name: "", company: "", description: "" });
      setIsCreateProjectOpen(false);
  
      toast({
        title: "Project Created",
        description: `Project "${project.name}" has been created successfully`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not create project",
        variant: "destructive",
      });
    }
  };

  

  const createApiKey = async () => {
    if (!selectedProject || !newKeyName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a key name",
        variant: "destructive",
      });
      return;
    }
  
    try {
      const res = await fetch("http://localhost:5000/admin/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: Number(selectedProject.id),
          name: newKeyName.trim(),
        }),
      });
  
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          (res.status === 409 ? "An API key with the same name already exists" : "Failed to create API key");
        throw new Error(msg);
      }
  
      const apiKey: ApiKey = {
        id: String(data.id ?? Date.now()),
        name: data.name ?? newKeyName.trim(),
        projectId: selectedProject.id,
        key: data.api_key ?? "",
        // @ts-ignore
        prefix: (data.api_key ?? "").slice(0, 5),
        createdAt: (data.created_at ? new Date(data.created_at) : new Date()).toISOString().split("T")[0],
        status: data.revoked ? "revoked" : "active",
        requests: 0,
        tokens: 0,
        latency: 0,
      };
  
      // persist secret locally so it survives refresh (optional, less secure)
      if (data.api_key) setSecret(apiKey.id, data.api_key);
  
      setApiKeys(prev => [...prev, apiKey]);
      setProjects(prev => prev.map(p => 
        p.id === selectedProject.id ? { ...p, keyCount: p.keyCount + 1 } : p
      ));
      setCreatedKey(data.api_key || apiKey.key);
      setNewKeyName("");
      
      toast({
        title: "API Key Created",
        description: `New API key "${apiKey.name}" has been created`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not create API key",
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  const formatKey = (key: string, isVisible: boolean, prefix?: string) => {
    // if we have the raw key and visibility is on, show it
    if (key && isVisible) return key;
    // mask with first 5 chars: prefer raw key, fallback to prefix from server
    const head = (key || prefix || "").slice(0, 5);
    if (!head) return "••••••••••••••••••••";
    return `${head}${"•".repeat(20)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const revokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/admin/apikey/${encodeURIComponent(keyId)}/revoke`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to revoke key");
      setApiKeys(prev => prev.map(k => (k.id === keyId ? { ...k, status: "revoked" } : k)));
      toast({ title: "Key Revoked", description: "API key has been revoked" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not revoke key", variant: "destructive" });
    }
  };

  const restoreKey = async (keyId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/admin/apikey/${encodeURIComponent(keyId)}/restore`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to restore key");
      setApiKeys(prev => prev.map(k => (k.id === keyId ? { ...k, status: "active" } : k)));
      toast({ title: "Key Restored", description: "API key has been restored" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not restore key", variant: "destructive" });
    }
  };

  // load projects on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/admin/projects", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const list: Project[] = (Array.isArray(data) ? data : []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          company: p.department ?? "",
          description: p.description ?? "",
          createdAt: (p.created_at ? new Date(p.created_at) : new Date()).toISOString().split("T")[0],
          keyCount: typeof p.key_count === "number" ? p.key_count : 0, // use backend count if present
        }));
        setProjects(list);
      } catch {}
    })();
  }, []);

  // load api keys when a project is selected
  useEffect(() => {
    if (!selectedProject) return;
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/admin/apikeys?project_id=${encodeURIComponent(selectedProject.id)}`,
          { method: "GET", credentials: "include" }
        );
        if (!res.ok) {
          setApiKeys([]);
          // also zero the count for this project
          setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, keyCount: 0 } : p));
          return;
        }
        const data = await res.json();
        const keys: ApiKey[] = (Array.isArray(data) ? data : []).map((k: any) => ({
          id: String(k.id),
          name: k.name,
          projectId: selectedProject.id,
          key: getSecret(String(k.id)) || "",
          prefix: typeof k.prefix === "string" ? k.prefix : "",
          createdAt: (k.created_at ? new Date(k.created_at) : new Date()).toISOString().split("T")[0],
          status: k.revoked ? "revoked" : "active",
          requests: 0,
          tokens: 0,
          latency: 0,
        }));
        setApiKeys(keys);
        // keep badge count in sync
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, keyCount: keys.length } : p));
      } catch {
        setApiKeys([]);
      }
    })();
  }, [selectedProject?.id]);

  if (selectedProject) {
    const projectKeys = apiKeys.filter(key => key.projectId === selectedProject.id);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2"
            >
              ← Back to Projects
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
              <p className="text-muted-foreground">{selectedProject.company} Department</p>
            </div>
            <Button className="bg-red-400 hover:bg-red-600" onClick={handleDeleteProject} disabled={isDeleting}>
                <Trash className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
          
          <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for {selectedProject.name}
                </DialogDescription>
              </DialogHeader>
              
              {!createdKey ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateKeyOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createApiKey}>
                      Create Key
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Label className="text-sm font-medium text-green-800">Your new API key</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-white border rounded text-sm font-mono text-green-700">
                        {createdKey}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(createdKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Make sure to copy this key now. You won't be able to see it again.
                    </p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setIsCreateKeyOpen(false);
                      setCreatedKey(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys ({projectKeys.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectKeys.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {formatKey(apiKey.key, visibleKeys.has(apiKey.id), (apiKey as any).prefix)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            title={visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                            aria-pressed={visibleKeys.has(apiKey.id)}
                            disabled={!apiKey.key}
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
                        <Badge variant={apiKey.status === "active" ? "default" : "destructive"}>
                          {apiKey.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{apiKey.requests.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey.key)}
                            disabled={!apiKey.key}
                            title={apiKey.key ? "Copy key" : "No key to copy"}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {apiKey.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeKey(apiKey.id)}
                              title="Revoke key"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreKey(apiKey.id)}
                              title="Restore key"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first API key for this project
                </p>
                <Button onClick={() => setIsCreateKeyOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Company Projects</h2>
          <p className="text-muted-foreground">Organize your API keys by company projects for better management and security.</p>
        </div>
        
        <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your API keys
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="e.g., AI Assistant"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="company">Department/Office</Label>
                <Input
                  id="company"
                  placeholder="e.g., Engineering, Marketing"
                  value={newProject.company}
                  onChange={(e) => setNewProject({ ...newProject, company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the project"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProject}>
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="cursor-pointer hover:shadow-glow transition-all duration-200"
            onClick={() => setSelectedProject(project)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {project.keyCount} keys
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{project.company} Department</p>
              {project.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {project.createdAt}</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}