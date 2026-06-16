import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";

export const Logo = ({ light = false }: { light?: boolean }) => {
  const { brand } = useSettings();
  const { companyName } = useAuth();
  const hasLogo = !!brand.logo_url;
  const displayName = companyName || brand.company_name || "Rocket Services";
  return (
    <Link to="/" className="flex items-center gap-2 font-bold">
      <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ${light ? "bg-white/15" : hasLogo ? "bg-card" : "bg-gradient-primary"} shadow-soft`}>
        {hasLogo
          ? <img src={brand.logo_url} alt={displayName} className="h-full w-full object-contain" />
          : <Rocket className={`h-5 w-5 ${light ? "text-white" : "text-primary-foreground"}`} />}
      </span>
      <span className={`text-lg truncate max-w-[200px] ${light ? "text-white" : "text-foreground"}`}>
        {displayName}
      </span>
    </Link>
  );
};
