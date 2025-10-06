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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Search, Shield, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

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
      
      const { data, error } = await supabase.functions.invoke('admin-get-users');
      
      if (error) throw error;
      
      setUsers(data.users || []);
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

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-delete-users', {
        body: { userIds: [userId] }
      });

      if (error) throw error;

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Failed to delete user");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const { error } = await supabase.functions.invoke('admin-delete-users', {
        body: { userIds: Array.from(selectedUsers) }
      });

      if (error) throw error;

      toast.success(`Successfully deleted ${selectedUsers.size} user(s)`);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error("Failed to delete users");
    }
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
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
            
            {/* Search and Bulk Actions */}
            <div className="flex gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedUsers.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedUsers.size} user(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Email Notifications</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="font-semibold w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchTerm ? "No users found matching your search" : "No users found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleSelectUser(user.id)}
                          />
                        </TableCell>
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
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setUserToDelete(user.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {userToDelete
                  ? "This will permanently delete this user and all their data. This action cannot be undone."
                  : `This will permanently delete ${selectedUsers.size} user(s) and all their data. This action cannot be undone.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setUserToDelete(null);
                setDeleteDialogOpen(false);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (userToDelete) {
                    handleDeleteUser(userToDelete);
                    setUserToDelete(null);
                  } else {
                    handleBulkDelete();
                  }
                  setDeleteDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
