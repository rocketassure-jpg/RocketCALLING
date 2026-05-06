import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CallingList } from "@/components/CallingList";
import { BreakToggle } from "@/components/agent/BreakToggle";
import { MobileBottomNav } from "@/components/agent/MobileBottomNav";
import { UserActionMenu } from "@/components/UserActionMenu";
import { TrainingModule } from "@/components/TrainingModule";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { InstallPWA } from "@/components/InstallPWA";
import { Plus, Phone, GraduationCap } from "lucide-react";

type Area = { id: string; name: string };

const TelecallerDashboard = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [tab, setTab] = useState<"home" | "leads" | "menu">("home");
  const [view, setView] = useState<"calls" | "training" | "add">("calls");
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    if (user) supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setFullName(data?.full_name ?? ""));
    // Telecaller can only see their assigned areas
    supabase.from("telecaller_areas").select("areas(id,name)").then(({ data }) => {
      const a = (data ?? []).map((r: any) => r.areas).filter(Boolean);
      setAreas(a);
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <div className="flex items-center gap-2">
            <HamburgerMenu
              items={[
                { id: "calls", label: "Calls", icon: Phone },
                { id: "add", label: "Add Lead", icon: Plus },
                { id: "training", label: "Training", icon: GraduationCap },
              ]}
              onChange={(id) => { setView(id as any); setTab("home"); }}
              userName={fullName || user?.email}
            />
            <Logo />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <InstallPWA />
            <Button variant="hero" size="sm" onClick={() => { setView("add"); setTab("home"); }}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Lead</span>
            </Button>
            <UserActionMenu label={fullName || user?.email} onTraining={() => { setView("training"); setTab("home"); }} />
          </div>
        </div>
      </header>

      <main className="container space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-5">
        {tab === "home" && view === "calls" && (
          <>
            <div>
              <h1 className="text-xl font-bold">Today's Calling List</h1>
              <p className="text-sm text-muted-foreground">Sirf aaj ya overdue leads dikh rahe hain.</p>
            </div>
            <BreakToggle />
            <CallingList callerName={fullName || "Rocket Services"} filterAssigned role="telecaller" />
          </>
        )}
        {tab === "home" && view === "training" && (
          <>
            <Button variant="outline" size="sm" onClick={() => setView("calls")}>← Back to calls</Button>
            <TrainingModule canManage={false} />
          </>
        )}
        {tab === "home" && view === "add" && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Add Walk-in / Reference Lead</h1>
              <Button variant="outline" size="sm" onClick={() => setView("calls")}>← Back</Button>
            </div>
            {areas.length === 0 ? (
              <p className="rounded-lg border bg-warning/10 p-4 text-sm">Aapko abhi koi area assign nahi hai. Admin se request karein.</p>
            ) : (
              <AddCustomerForm areas={areas} onDone={() => setView("calls")} />
            )}
          </>
        )}
        {tab === "leads" && (
          <>
            <h1 className="text-xl font-bold">All My Leads</h1>
            <CallingList callerName={fullName || "Rocket Services"} filterAssigned role="telecaller" />
          </>
        )}
        {tab === "menu" && (
          <div className="space-y-3">
            <h1 className="text-xl font-bold">Menu</h1>
            <BreakToggle />
            <Button variant="outline" className="w-full" onClick={() => { setView("training"); setTab("home"); }}>Training Module</Button>
            <Button variant="hero" className="w-full" onClick={() => { setView("add"); setTab("home"); }}><Plus className="h-4 w-4" /> Add Lead</Button>
          </div>
        )}
      </main>

      <MobileBottomNav active={tab} onChange={setTab} onCallClick={() => { setView("calls"); setTab("home"); }} />
    </div>
  );
};

export default TelecallerDashboard;
