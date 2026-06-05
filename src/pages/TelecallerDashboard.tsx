import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CallingList } from "@/components/CallingList";
import { BreakToggle } from "@/components/agent/BreakToggle";
import { MobileBottomNav } from "@/components/agent/MobileBottomNav";
import { TrainingModule } from "@/components/TrainingModule";
import { AddCustomerForm } from "@/components/admin/AddCustomerForm";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { InstallPWA } from "@/components/InstallPWA";
import { PremiumCalculator } from "@/components/PremiumCalculator";
import { AccountSettings } from "@/components/AccountSettings";
import { LayoutDashboard, Users, Plus, Phone, GraduationCap, Calculator, Settings, LogOut } from "lucide-react";

type Area = { id: string; name: string };
type View = "calls" | "leads" | "add" | "training" | "calculator" | "account";

const TelecallerDashboard = () => {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [tab, setTab] = useState<"home" | "leads" | "menu">("home");
  const [view, setView] = useState<View>("calls");
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    if (user) supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => setFullName(data?.full_name ?? ""));
    supabase.from("telecaller_areas").select("areas(id,name)").then(({ data }) => {
      const a = (data ?? []).map((r: any) => r.areas).filter(Boolean);
      setAreas(a);
    });
  }, [user]);

  const goto = (v: View) => { setView(v); setTab("home"); };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background shadow-soft">
        <div className="container flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <div className="flex items-center gap-2">
            <HamburgerMenu
              items={[
                { id: "calls", label: "Dashboard", icon: LayoutDashboard },
                { id: "leads", label: "Leads", icon: Users },
                { id: "add", label: "Add Lead", icon: Plus },
                { id: "calculator", label: "Premium Calculator", icon: Calculator },
                { id: "training", label: "Training", icon: GraduationCap },
                { id: "account", label: "Account Settings", icon: Settings },
              ]}
              active={view}
              onChange={(id) => goto(id as View)}
              userName={fullName || user?.email}
              topSlot={<BreakToggle />}
            />
            <Logo />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <InstallPWA />
            <Button variant="hero" size="sm" onClick={() => goto("add")}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Lead</span>
            </Button>
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
            <CallingList callerName={fullName || "Rocket Services"} filterAssigned role="telecaller" />
          </>
        )}
        {tab === "home" && view === "leads" && (
          <>
            <h1 className="text-xl font-bold">All My Leads</h1>
            <CallingList callerName={fullName || "Rocket Services"} filterAssigned role="telecaller" />
          </>
        )}
        {tab === "home" && view === "training" && (
          <>
            <Button variant="outline" size="sm" onClick={() => goto("calls")}>← Back to calls</Button>
            <TrainingModule canManage={false} />
          </>
        )}
        {tab === "home" && view === "add" && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Add Walk-in / Reference Lead</h1>
              <Button variant="outline" size="sm" onClick={() => goto("calls")}>← Back</Button>
            </div>
            {areas.length === 0 ? (
              <p className="rounded-lg border bg-warning/10 p-4 text-sm">Aapko abhi koi area assign nahi hai. Admin se request karein.</p>
            ) : (
              <AddCustomerForm areas={areas} onDone={() => goto("calls")} />
            )}
          </>
        )}
        {tab === "home" && view === "calculator" && (
          <>
            <Button variant="outline" size="sm" onClick={() => goto("calls")}>← Back to calls</Button>
            <PremiumCalculator />
          </>
        )}
        {tab === "home" && view === "account" && (
          <>
            <Button variant="outline" size="sm" onClick={() => goto("calls")}>← Back</Button>
            <AccountSettings />
          </>
        )}
        {tab === "leads" && (
          <>
            <h1 className="text-xl font-bold">All My Leads</h1>
            <CallingList callerName={fullName || "Rocket Services"} filterAssigned role="telecaller" />
          </>
        )}
        {tab === "menu" && (
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Menu</h1>
            <BreakToggle />
            <Button variant="outline" className="min-h-[44px] w-full justify-start" onClick={() => goto("calls")}><LayoutDashboard className="h-4 w-4" /> Dashboard</Button>
            <Button variant="outline" className="min-h-[44px] w-full justify-start" onClick={() => goto("leads")}><Users className="h-4 w-4" /> Leads</Button>
            <Button variant="outline" className="min-h-[44px] w-full justify-start" onClick={() => goto("calculator")}><Calculator className="h-4 w-4" /> Premium Calculator</Button>
            <Button variant="outline" className="min-h-[44px] w-full justify-start" onClick={() => goto("training")}><GraduationCap className="h-4 w-4" /> Training</Button>
            <Button variant="outline" className="min-h-[44px] w-full justify-start" onClick={() => goto("account")}><Settings className="h-4 w-4" /> Account Settings</Button>
            <Button variant="hero" className="min-h-[44px] w-full" onClick={() => goto("add")}><Plus className="h-4 w-4" /> Add Lead</Button>
            <Button variant="destructive" className="min-h-[44px] w-full" onClick={signOut}><LogOut className="h-4 w-4" /> Logout</Button>
          </div>
        )}
      </main>

      <MobileBottomNav active={tab} onChange={setTab} />
    </div>
  );
};

export default TelecallerDashboard;
