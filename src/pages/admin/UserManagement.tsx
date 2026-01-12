import { useState } from "react";
import { useProfiles, useUpdateProfile, useDeleteProfile } from "@/hooks/useProfiles";
import { 
  Users, 
  Edit2, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX, 
  Search,
  Mail,
  Crown,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

const ROLE_LABELS: Record<UserRole, string> = {
  sales: "Account Executive",
  tenaga_pialang: "Tenaga Pialang",
  tenaga_ahli: "Tenaga Ahli",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  sales: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  tenaga_pialang: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  tenaga_ahli: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ROLE_ICONS: Record<UserRole, string> = {
  sales: "💼",
  tenaga_pialang: "🔍",
  tenaga_ahli: "⚡",
  admin: "👑",
};

export default function UserManagement() {
  const { data: profiles, isLoading } = useProfiles();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ 
    full_name: "", 
    role: "" as UserRole, 
    is_active: true,
    is_admin: false 
  });

  const handleEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditForm({
      full_name: profile.full_name,
      role: profile.role,
      is_active: profile.is_active,
      is_admin: (profile as any).is_admin || false,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProfile) return;
    try {
      await updateProfile.mutateAsync({
        id: selectedProfile.id,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
        is_admin: editForm.is_admin,
      });
      toast.success("User updated successfully");
      setEditDialogOpen(false);
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleDelete = (profile: Profile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProfile) return;
    try {
      await deleteProfile.mutateAsync(selectedProfile.id);
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const filteredProfiles = profiles?.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = {
    total: profiles?.length || 0,
    active: profiles?.filter(p => p.is_active).length || 0,
    inactive: profiles?.filter(p => !p.is_active).length || 0,
    admins: profiles?.filter(p => p.role === "admin" || (p as any).is_admin).length || 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Administration</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">User Management</h1>
              <p className="text-white/80 text-sm md:text-base">
                Manage team members, roles, and permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-white/80">Users</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-background border-border/50 focus:border-primary"
        />
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => (
          <Card 
            key={profile.id} 
            className={`group hover:shadow-lg transition-all duration-300 overflow-hidden ${
              !profile.is_active ? "opacity-60" : ""
            }`}
          >
            <CardContent className="p-0">
              {/* Card Header with Avatar */}
              <div className="p-4 pb-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-semibold text-primary">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                        {profile.full_name}
                        {(profile as any).is_admin && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(profile)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(profile)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <Badge className={`${ROLE_COLORS[profile.role]} border-0`}>
                    <span className="mr-1">{ROLE_ICONS[profile.role]}</span>
                    {ROLE_LABELS[profile.role]}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge 
                    variant="outline"
                    className={profile.is_active 
                      ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" 
                      : "border-gray-400 text-gray-500"
                    }
                  >
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Joined</span>
                  <span className="text-xs font-medium text-foreground">
                    {format(new Date(profile.created_at), "MMM dd, yyyy")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "No users have been added yet"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update user information, role, and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span>{ROLE_ICONS[value as UserRole]}</span>
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <Label className="font-normal">Admin Access</Label>
              </div>
              <Switch
                checked={editForm.is_admin}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <Label className="font-normal">Active Account</Label>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedProfile?.full_name}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProfile.isPending}>
              {deleteProfile.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
