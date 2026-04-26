import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { role, loading, user } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "telecaller") return <Navigate to="/telecaller" replace />;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">No role assigned yet</h1>
      <p className="max-w-md text-muted-foreground">Your account exists but an admin hasn't assigned a role yet. Please contact your administrator.</p>
    </div>
  );
};

export default Dashboard;
