import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchAllStaffUsers, createStaffUser, deleteUserRole, updateUserRole } from "@/lib/supabase-superadmin";

type StaffUser = { id: string; user_id: string; role: string };
type AppRole = "manager" | "admin" | "superadmin";

const roleBadgeVariant = (role: string) => {
  if (role === "superadmin") return "destructive" as const;
  if (role === "admin") return "default" as const;
  return "secondary" as const;
};

const UserManagement = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("manager");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchAllStaffUsers();
      setUsers(data);
    } catch {
      toast({ title: "Error loading users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;
    try {
      setCreating(true);
      await createStaffUser(newEmail, newPassword, newRole);
      toast({ title: "Staff user created" });
      setDialogOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("manager");
      load();
    } catch (err: any) {
      toast({ title: "Error creating user", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (roleId: string, role: AppRole) => {
    try {
      await updateUserRole(roleId, role);
      toast({ title: "Role updated" });
      load();
    } catch (err: any) {
      toast({ title: "Error updating role", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Remove this user's role? They will lose access.")) return;
    try {
      await deleteUserRole(roleId);
      toast({ title: "Role removed" });
      load();
    } catch (err: any) {
      toast({ title: "Error removing role", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Staff Users</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="staff@cinema.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={creating || !newEmail || !newPassword} className="w-full">
                {creating ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>
      ) : users.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <UserCog className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No staff users yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.user_id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as AppRole)}>
                      <SelectTrigger className="w-[130px] h-8">
                        <Badge variant={roleBadgeVariant(u.role)} className="text-xs">{u.role}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
};

export default UserManagement;
