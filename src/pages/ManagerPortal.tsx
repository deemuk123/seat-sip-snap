import { motion } from "framer-motion";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ManagerPortal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/staff/dashboard")} className="flex items-center gap-1.5 text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg cinema-gradient-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Manager Portal</h1>
              <p className="text-xs text-muted-foreground">Order management & menu controls</p>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Manager features will be built in Phase 3 — order dashboard, status management, and menu controls.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ManagerPortal;
