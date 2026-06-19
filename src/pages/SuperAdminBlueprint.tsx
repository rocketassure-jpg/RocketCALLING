import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft, LogOut, Rocket } from "lucide-react";
import { BlueprintCard, SourceExportCard, FullExportCard, ScheduleAutoExportCard, ExportWarning, PiiNotice } from "@/components/super-admin/blueprint/BlueprintCards";

const SuperAdminBlueprint = () => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900">
        <div className="container flex h-auto min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <Logo />
            <Badge variant="destructive" className="hidden sm:inline-flex">Blueprint & Export</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700">
              <Link to="/super-admin"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline ml-1">Back</span></Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-4 px-3 py-4">
        <div className="rounded-xl bg-background p-4 text-foreground space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Rocket className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Blueprint & Export</h1>
              <p className="text-sm text-muted-foreground">Migration-safety toolkit — extract everything you need to rebuild Rocket CRM elsewhere.</p>
            </div>
          </div>

          <ExportWarning />
          <PiiNotice />

          <div className="grid gap-4 md:grid-cols-3">
            <BlueprintCard />
            <SourceExportCard />
            <FullExportCard />
          </div>

          <ScheduleAutoExportCard />
        </div>
      </main>
    </div>
  );
};

export default SuperAdminBlueprint;
