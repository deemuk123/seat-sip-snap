import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard, BarChart3, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user, roles, signOut, hasRole } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/staff/login");
  };

  const portals = [
    {
      title: "Manager Portal",
      description: "Manage orders, update statuses, control menu items",
      icon: LayoutDashboard,
      path: "/manager",
      role: "manager" as const,
      available: hasRole("manager") || hasRole("admin") || hasRole("superadmin"),
    },
    {
      title: "Admin Portal",
      description: "Analytics dashboard, system configuration",
      icon: BarChart3,
      path: "/admin",
      role: "admin" as const,
      available: hasRole("admin") || hasRole("superadmin"),
    },
    {
      title: "Super Admin",
      description: "User management, multi-location, audit logs",
      icon: Shield,
      path: "/superadmin",
      role: "superadmin" as const,
      available: hasRole("superadmin"),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">BigMovies Staff</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground font-display">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-3">
          {portals.map((portal, i) => (
            <motion.button
              key={portal.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => portal.available && navigate(portal.path)}
              disabled={!portal.available}
              className="w-full text-left rounded-xl bg-card border border-border p-5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <portal.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{portal.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{portal.description}</p>
                  {!portal.available && (
                    <span className="text-xs text-destructive mt-1 block">No access</span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-secondary p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Your roles:</span>{" "}
            {roles.length > 0 ? roles.join(", ") : "No roles assigned"}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffDashboard;
