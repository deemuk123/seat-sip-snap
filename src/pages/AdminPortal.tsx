import { motion } from "framer-motion";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminPortal = () => {
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
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Analytics & system configuration</p>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Admin features will be built in Phase 4 — performance dashboards, system controls, and settings.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPortal;
