import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { PendingApproval } from "@/components/PendingApproval";

type Role = "admin" | "manager" | "telecaller" | "sub_agent";

export const ProtectedRoute = ({ children, requireRole, requireSuperAdmin }: { children: ReactNode; requireRole?: Role; requireSuperAdmin?: boolean }) => {
  const { user, role, loading, profileStatus, isSuperAdmin } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (profileStatus && !profileStatus.is_active) {
    return <PendingApproval reason={profileStatus.rejection_reason || "Aapka account admin ne deactivate kar diya hai. Admin se contact karein."} />;
  }

  if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  // Admin (Owner) can access any role-protected page
  if (requireRole && role !== requireRole && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
