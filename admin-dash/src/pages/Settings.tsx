import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Trash2, Users, Settings as SettingsIcon, Shield, Bell, Database, Globe, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  createdAt: string;
  status: "active" | "inactive";
}

const Settings = () => {
  const navigate = useNavigate();
  const API_BASE = "http://localhost:5000"; // NEW: backend base URL

  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      username: "admin",
      createdAt: "2024-01-15",
      status: "active"
    },
    {
      id: "2", 
      username: "operator",
      createdAt: "2024-02-20",
      status: "active"
    }
  ]);
  
  const [newUser, setNewUser] = useState({
    username: "",
    password: ""
  });

  // NEW: current logged-in user id (to hide from table)
  const [meId, setMeId] = useState<string | null>(null);

  // NEW: fetch current user
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (alive && json?.user?.id != null) setMeId(String(json.user.id));
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // NEW: Load company users from backend
  useEffect(() => {
    let alive = true;

    const mapUsers = (arr: any[]): User[] =>
      (arr || []).map((u: any) => ({
        id: String(u.id ?? u.user_id ?? Math.random().toString(36).slice(2)),
        username: String(u.username ?? ""),
        createdAt: String(u.created_at ?? u.createdAt ?? new Date().toISOString().split("T")[0]).slice(0, 10),
        status: ((u.status ?? "active") === "inactive" ? "inactive" : "active") as "active" | "inactive",
      }));

    const loadUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users`, { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!alive) return;
        setUsers(mapUsers(json));
      } catch (e: any) {
        toast({ title: "Failed to load users", description: e?.message || "Error", variant: "destructive" });
      }
    };

    loadUsers();
    return () => { alive = false; };
  }, []);
  
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast({ title: "Missing fields", description: "Username and password are required", variant: "destructive" });
      return;
    }

    try {
      // Create on backend
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUser.username, password: newUser.password }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Refresh list
      const list = await fetch(`${API_BASE}/admin/users`, { credentials: "include" });
      const json = await list.json();
      const mapped: User[] = (json || []).map((u: any) => ({
        id: String(u.id ?? Math.random().toString(36).slice(2)),
        username: String(u.username ?? ""),
        createdAt: String(u.created_at ?? u.createdAt ?? new Date().toISOString().split("T")[0]).slice(0, 10),
        status: ((u.status ?? "active") === "inactive" ? "inactive" : "active") as "active" | "inactive",
      }));
      setUsers(mapped);

      setNewUser({ username: "", password: "" });
      toast({
        title: "User created",
        description: `User ${newUser.username} has been created successfully`,
      });
    } catch (e: any) {
      toast({ title: "Create failed", description: e?.message || "Error", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string, username?: string) => {
    const ok = window.confirm(
      `Are you sure you want to delete user "${username || userId}"? This action cannot be undone.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        // Try to surface server message like "You cannot delete your own account"
        const txt = await res.text();
        let msg = txt;
        try {
          const j = JSON.parse(txt);
          msg = j.detail || j.message || txt;
        } catch {}
        throw new Error(msg);
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({
        title: "User deleted",
        description: `User ${username || userId} has been removed from the system`,
      });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Error", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/login");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-muted-foreground">
            Manage users and system configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Management */}
          <Card className="card-gradient shadow-card lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create and manage user accounts</CardDescription>
                </div>
                
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create User Form */}
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </form>

              {/* Users Table */}
              <div>
                <h3 className="font-semibold mb-4">Existing Users ({users.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((user) => !meId || user.id !== meId) // NEW: hide current user
                      .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.createdAt}</TableCell>
                        <TableCell>
                          <Badge className={user.status === "active" ? "bg-success/10 text-success" : "bg-muted"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* System Actions */}
          {/* <Card className="card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle>System Actions</CardTitle>
                  <CardDescription>Critical system controls</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
              >
                Logout from Fortress
              </Button>
            </CardContent>
          </Card> */}

          {/* Company Configuration */}
          <Card className="card-gradient shadow-card lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Company Configuration</CardTitle>
                  <CardDescription>Configure company-wide settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  />
                </div> */}
                {/* <div className="space-y-2">
                  <Label htmlFor="domain">Company Domain</Label>
                  <Input
                    id="domain"
                    value={companySettings.domain}
                    onChange={(e) => setCompanySettings({ ...companySettings, domain: e.target.value })}
                  />
                </div> */}
                {/* <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={companySettings.timezone} onValueChange={(value) => setCompanySettings({ ...companySettings, timezone: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-5">UTC-5 (Eastern)</SelectItem>
                      <SelectItem value="UTC-6">UTC-6 (Central)</SelectItem>
                      <SelectItem value="UTC-7">UTC-7 (Mountain)</SelectItem>
                      <SelectItem value="UTC-8">UTC-8 (Pacific)</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                {/* <div className="space-y-2">
                  <Label htmlFor="apiTimeout">API Timeout (seconds)</Label>
                  <Input
                    id="apiTimeout"
                    type="number"
                    value={companySettings.apiTimeout}
                    onChange={(e) => setCompanySettings({ ...companySettings, apiTimeout: e.target.value })}
                  />
                </div> */}
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          {/* <Card className="card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure security policies</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                </div>
                <Switch
                  checked={companySettings.enableTwoFactor}
                  onCheckedChange={(checked) => setCompanySettings({ ...companySettings, enableTwoFactor: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Logs</Label>
                  <p className="text-sm text-muted-foreground">Enable comprehensive logging</p>
                </div>
                <Switch
                  checked={companySettings.enableAuditLogs}
                  onCheckedChange={(checked) => setCompanySettings({ ...companySettings, enableAuditLogs: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention (days)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={companySettings.dataRetentionDays}
                  onChange={(e) => setCompanySettings({ ...companySettings, dataRetentionDays: e.target.value })}
                />
              </div>
            </CardContent>
          </Card> */}

          {/* Notification Settings */}
          {/* <Card className="card-gradient shadow-card lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure system notifications and alerts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for system events</p>
                </div>
                <Switch
                  checked={companySettings.enableNotifications}
                  onCheckedChange={(checked) => setCompanySettings({ ...companySettings, enableNotifications: checked })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Notifications</Label>
                  <Select defaultValue="critical">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="important">Important Only</SelectItem>
                      <SelectItem value="critical">Critical Only</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Webhook Notifications</Label>
                  <Select defaultValue="important">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="important">Important Only</SelectItem>
                      <SelectItem value="critical">Critical Only</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Database Settings */}
          {/* <Card className="card-gradient shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Database Settings</CardTitle>
                  <CardDescription>Database configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Pool Size</Label>
                <Input type="number" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label>Query Timeout (ms)</Label>
                <Input type="number" defaultValue="5000" />
              </div>
              <Button variant="outline" className="w-full">
                Test Connection
              </Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;