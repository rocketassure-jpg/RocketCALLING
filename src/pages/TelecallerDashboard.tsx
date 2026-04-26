import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CallingList } from "@/components/CallingList";
import { LogOut } from "lucide-react";

const TelecallerDashboard = () => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user) supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Hi, {fullName || "Telecaller"}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-6">
        <div>
          <h1 className="text-xl font-bold">Today's Calling List</h1>
          <p className="text-sm text-muted-foreground">Sirf aaj ya overdue leads dikh rahe hain. Future leads us tarikh ko apne aap aayenge.</p>
        </div>
        <CallingList callerName={fullName || "Rocket Services"} />
      </main>
    </div>
  );
};

export default TelecallerDashboard;
