import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";

export const Logo = ({ light = false }: { light?: boolean }) => (
  <Link to="/" className="flex items-center gap-2 font-bold">
    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${light ? "bg-white/15" : "bg-gradient-primary"} shadow-soft`}>
      <Rocket className={`h-5 w-5 ${light ? "text-white" : "text-primary-foreground"}`} />
    </span>
    <span className={`text-lg ${light ? "text-white" : "text-foreground"}`}>
      Rocket <span className="text-primary">Insurance</span>
    </span>
  </Link>
);
