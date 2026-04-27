import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CallingList } from "@/components/CallingList";
import { BreakToggle } from "@/components/agent/BreakToggle";
import { MobileBottomNav } from "@/components/agent/MobileBottomNav";
import { LogOut } from "lucide-react";

const TelecallerDashboard = () => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [tab, setTab] = useState<"home" | "leads" | "menu">("home");

  useEffect(() => {
    if (user) supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Hi, {fullName || "Agent"}</span>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
      </header>

      <main className="container space-y-5 py-5">
        {tab === "home" && (
          <>
            <div>
              <h1 className="text-xl font-bold">Today's Calling List</h1>
              <p className="text-sm text-muted-foreground">Sirf aaj ya overdue leads dikh rahe hain.</p>
            </div>
            <BreakToggle />
            <CallingList callerName={fullName || "Rocket Services"} />
          </>
        )}
        {tab === "leads" && (
          <>
            <h1 className="text-xl font-bold">All My Leads</h1>
            <CallingList callerName={fullName || "Rocket Services"} />
          </>
        )}
        {tab === "menu" && (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">Menu</h1>
            <BreakToggle />
            <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        )}
      </main>

      <MobileBottomNav active={tab} onChange={setTab} onCallClick={() => setTab("home")} />
    </div>
  );
};

export default TelecallerDashboard;
