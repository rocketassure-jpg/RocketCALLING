import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy-load every page → smaller initial bundle, faster first paint
const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const TelecallerDashboard = lazy(() => import("./pages/TelecallerDashboard.tsx"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard.tsx"));
const SuperAdminBlueprint = lazy(() => import("./pages/SuperAdminBlueprint.tsx"));
const SubAgentDashboard = lazy(() => import("./pages/SubAgentDashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Trust = lazy(() => import("./pages/Trust.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/trust" element={<Trust />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/telecaller" element={<ProtectedRoute requireRole="telecaller"><TelecallerDashboard /></ProtectedRoute>} />
                  <Route path="/manager" element={<ProtectedRoute requireRole="manager"><ManagerDashboard /></ProtectedRoute>} />
                  <Route path="/sub-agent" element={<ProtectedRoute requireRole="sub_agent"><SubAgentDashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/super-admin" element={<ProtectedRoute requireSuperAdmin><SuperAdminDashboard /></ProtectedRoute>} />
                  <Route path="/super-admin/blueprint" element={<ProtectedRoute requireSuperAdmin><SuperAdminBlueprint /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
