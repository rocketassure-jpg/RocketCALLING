import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Ban } from "lucide-react";

export const PendingApproval = ({ reason }: { reason?: string | null }) => {
  const { signOut } = useAuth();
  const isBlocked = !!reason;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${isBlocked ? "bg-destructive/10" : "bg-warning/10"}`}>
            {isBlocked ? <Ban className="h-7 w-7 text-destructive" /> : <Clock className="h-7 w-7 text-warning" />}
          </div>
          <CardTitle>{isBlocked ? "Account deactivated" : "Pending admin approval"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          {isBlocked ? (
            <p>{reason || "Aapka account admin ne deactivate kar diya hai."}</p>
          ) : (
            <p>Aapka account ban gaya hai. Admin approve karega tab dashboard access milega.</p>
          )}
          <Button variant="outline" className="w-full" onClick={signOut}>Sign out</Button>
        </CardContent>
      </Card>
    </div>
  );
};
