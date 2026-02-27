import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ShowSelection from "./pages/ShowSelection";
import DeliveryMode from "./pages/DeliveryMode";
import MenuPage from "./pages/MenuPage";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import OrderTracking from "./pages/OrderTracking";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import ManagerPortal from "./pages/ManagerPortal";
import AdminPortal from "./pages/AdminPortal";
import SuperAdminPortal from "./pages/SuperAdminPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer routes */}
            <Route path="/" element={<ShowSelection />} />
            <Route path="/delivery" element={<DeliveryMode />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmation" element={<Confirmation />} />
            <Route path="/tracking" element={<OrderTracking />} />

            {/* Staff routes */}
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/dashboard" element={
              <ProtectedRoute allowedRoles={["manager", "admin", "superadmin"]}>
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/manager/*" element={
              <ProtectedRoute allowedRoles={["manager", "admin", "superadmin"]}>
                <ManagerPortal />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                <AdminPortal />
              </ProtectedRoute>
            } />
            <Route path="/superadmin/*" element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <SuperAdminPortal />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
