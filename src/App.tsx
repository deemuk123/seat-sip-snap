import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { lazy, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

// Lazy-loaded route components
const ShowSelection = lazy(() => import("./pages/ShowSelection"));
const DeliveryMode = lazy(() => import("./pages/DeliveryMode"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const ManagerPortal = lazy(() => import("./pages/ManagerPortal"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const SuperAdminPortal = lazy(() => import("./pages/SuperAdminPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
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
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
