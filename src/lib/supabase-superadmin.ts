import { supabase } from "@/integrations/supabase/client";

export async function fetchAllStaffUsers() {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id, user_id, role");
  if (error) throw error;
  return data || [];
}

export async function createStaffUser(email: string, password: string, role: string) {
  const { data, error } = await supabase.functions.invoke("create-staff-user", {
    body: { email, password, role },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteUserRole(roleId: string) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", roleId);
  if (error) throw error;
}

export async function updateUserRole(roleId: string, newRole: "manager" | "admin" | "superadmin") {
  const { error } = await supabase
    .from("user_roles")
    .update({ role: newRole })
    .eq("id", roleId);
  if (error) throw error;
}

export async function fetchAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
