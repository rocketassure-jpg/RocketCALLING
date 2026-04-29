import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, LogOut, GraduationCap, User } from "lucide-react";

export const UserActionMenu = ({ onTraining, label }: { onTraining: () => void; label?: ReactNode }) => {
  const { signOut, user, role } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="User menu">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <div className="flex-1 truncate">
            <div className="text-sm font-medium">{label || user?.email}</div>
            <div className="text-xs capitalize text-muted-foreground">{role}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onTraining} className="cursor-pointer">
          <GraduationCap className="mr-2 h-4 w-4 text-primary" /> Training Module
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
