import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const InstallPWA = ({ size = "sm" as const }) => {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed) return null;

  if (isIOS && !evt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size}><Smartphone className="h-4 w-4" /> <span className="hidden sm:inline">Install App</span></Button>
          </TooltipTrigger>
          <TooltipContent>Safari mein Share → Add to Home Screen dabao</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!evt) return null;

  return (
    <Button variant="outline" size={size} onClick={async () => {
      await evt.prompt();
      const r = await evt.userChoice;
      if (r.outcome === "accepted") toast({ title: "App install ho raha hai 📲" });
      setEvt(null);
    }}>
      <Smartphone className="h-4 w-4" /> <span className="hidden sm:inline">Install App</span>
    </Button>
  );
};
