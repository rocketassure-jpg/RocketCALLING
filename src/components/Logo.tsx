import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export const Logo = ({ light = false }: { light?: boolean }) => {
  const { brand } = useSettings();
  const hasLogo = !!brand.logo_url;
  return (
    <Link to="/" className="flex items-center gap-2 font-bold">
      <span className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg ${light ? "bg-white/15" : hasLogo ? "bg-card" : "bg-gradient-primary"} shadow-soft`}>
        {hasLogo
          ? <img src={brand.logo_url} alt={brand.company_name} className="h-full w-full object-contain" />
          : <Rocket className={`h-5 w-5 ${light ? "text-white" : "text-primary-foreground"}`} />}
      </span>
      <span className={`text-lg ${light ? "text-white" : "text-foreground"}`}>
        {brand.company_name || "Rocket Services"}
      </span>
    </Link>
  );
};
