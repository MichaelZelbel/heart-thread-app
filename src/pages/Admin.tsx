import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Search, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type UserRole = 'free' | 'pro' | 'pro_gift' | 'admin';

interface UserProfile {
  id: string;
  display_name: string;
  email: string | null;
  created_at: string;
  email_notifications_enabled: boolean | null;
}

interface UserWithRole extends UserProfile {
  role: UserRole;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .order('role', { ascending: true });

      if (rolesError) throw rolesError;

      // Create a map of user roles (taking the first/highest role)
      const roleMap = new Map<string, UserRole>();
      roles?.forEach(r => {
        if (!roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, r.role as UserRole);
        }
      });

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        ...profile,
        role: roleMap.get(profile.id) || 'free'
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      // Delete existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error("Failed to update user role");
    }
  };

  const toggleEmailNotifications = async (userId: string, currentValue: boolean | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: !currentValue })
        .eq('id', userId);

      if (error) throw error;

      toast.success("Email notifications updated");
      fetchUsers();
    } catch (error) {
      console.error('Error updating email notifications:', error);
      toast.error("Failed to update email notifications");
    }
  };

  const filteredUsers = users.filter(user => 
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pro': return 'bg-primary/10 text-primary border-primary/20';
      case 'pro_gift': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (roleLoading || (loading && users.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>

        {/* User Management Card */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              User Management
            </CardTitle>
            <CardDescription>
              View and manage user profiles and roles
            </CardDescription>
            
            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Email Notifications</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {searchTerm ? "No users found matching your search" : "No users found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => updateUserRole(user.id, value as UserRole)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue>
                                <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                                  {user.role}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="pro_gift">Pro Gift</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={user.email_notifications_enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleEmailNotifications(user.id, user.email_notifications_enabled)}
                            className="w-20"
                          >
                            {user.email_notifications_enabled ? "On" : "Off"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{users.length}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>
              <Card className="border-red-500/20">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">
                    {users.filter(u => u.role === 'pro' || u.role === 'pro_gift').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pro Users</div>
                </CardContent>
              </Card>
              <Card className="border-gray-500/20">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-500">
                    {users.filter(u => u.role === 'free').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Free Users</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
