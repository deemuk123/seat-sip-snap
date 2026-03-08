import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "manager" | "admin" | "superadmin";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles((data || []).map((r) => r.role as AppRole));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);

          // Log staff login
          if (event === "SIGNED_IN") {
            setTimeout(async () => {
              await supabase.from("audit_logs").insert({
                actor_id: session.user.id,
                action: "staff_login",
                target_type: "auth",
                target_id: session.user.id,
                details: { email: session.user.email },
              });
            }, 100);
          }
        } else {
          setRoles([]);
        }

        // Log logout
        if (event === "SIGNED_OUT" && user) {
          // Best-effort: user object still available from closure
          setTimeout(async () => {
            await supabase.from("audit_logs").insert({
              actor_id: user.id,
              action: "staff_logout",
              target_type: "auth",
              target_id: user.id,
              details: { email: user.email },
            });
          }, 0);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return { user, session, roles, loading, signIn, signOut, hasRole };
}
