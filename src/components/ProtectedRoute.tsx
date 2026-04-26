import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Role = "admin" | "manager" | "telecaller";

export const ProtectedRoute = ({ children, requireRole }: { children: ReactNode; requireRole?: Role }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  // Admin (Owner) can access any role-protected page
  if (requireRole && role !== requireRole && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
