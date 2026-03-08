import { motion } from "framer-motion";
import { ArrowLeft, Shield, Users, ScrollText, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/superadmin/UserManagement";
import AuditLogs from "@/components/superadmin/AuditLogs";
import WhatsAppSettings from "@/components/superadmin/WhatsAppSettings";

const SuperAdminPortal = () => {
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
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Super Admin</h1>
              <p className="text-xs text-muted-foreground">User management & audit logs</p>
            </div>
          </div>

          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5">
                <ScrollText className="w-4 h-4" /> Audit
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogs />
            </TabsContent>

            <TabsContent value="whatsapp">
              <WhatsAppSettings />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
