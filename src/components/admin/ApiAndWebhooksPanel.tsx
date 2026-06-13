import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Webhook, Lock } from "lucide-react";
import { ApiKeysManager } from "@/components/admin/ApiKeysManager";
import { SecretsManager } from "@/components/admin/SecretsManager";

export const ApiAndWebhooksPanel = () => {
  const [tab, setTab] = useState<"api" | "secrets">("api");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "api" ? "hero" : "outline"} onClick={() => setTab("api")}>
          <Webhook className="h-4 w-4" /> API & Webhooks
        </Button>
        <Button size="sm" variant={tab === "secrets" ? "hero" : "outline"} onClick={() => setTab("secrets")}>
          <Lock className="h-4 w-4" /> API Keys / Secrets
        </Button>
      </div>
      {tab === "api" ? <ApiKeysManager /> : <SecretsManager />}
    </div>
  );
};
