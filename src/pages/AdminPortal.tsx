import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, Settings, TrendingUp, Tag, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import DailyReportsDashboard from "@/components/admin/DailyReportsDashboard";
import SystemSettings from "@/components/admin/SystemSettings";
import CouponManager from "@/components/admin/CouponManager";
import IntervalBoostSettings from "@/components/admin/IntervalBoostSettings";

const AdminPortal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate("/staff/dashboard")} className="flex items-center gap-1.5 text-muted-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg cinema-gradient-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">Analytics & system configuration</p>
            </div>
          </div>

          <Tabs defaultValue="analytics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="analytics" className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" /> Reports
              </TabsTrigger>
              <TabsTrigger value="promos" className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Promos
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1.5">
                <Settings className="w-4 h-4" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analytics">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="reports">
              <DailyReportsDashboard />
            </TabsContent>

            <TabsContent value="promos" className="space-y-4">
              <CouponManager />
              <IntervalBoostSettings />
            </TabsContent>

            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPortal;
