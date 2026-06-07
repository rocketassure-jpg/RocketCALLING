import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { PendingApproval } from "@/components/PendingApproval";

type Role = "admin" | "manager" | "telecaller";

export const ProtectedRoute = ({ children, requireRole }: { children: ReactNode; requireRole?: Role }) => {
  const { user, role, loading, profileStatus } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  // Block only deactivated users (approval flow disabled)
  if (profileStatus && !profileStatus.is_active) {
    return <PendingApproval reason={profileStatus.rejection_reason || "Aapka account admin ne deactivate kar diya hai. Admin se contact karein."} />;
  }

  // Admin (Owner) can access any role-protected page
  if (requireRole && role !== requireRole && role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
