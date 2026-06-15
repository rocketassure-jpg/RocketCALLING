import { ApiKeysManager } from "@/components/admin/ApiKeysManager";
import { SecretsManager } from "@/components/admin/SecretsManager";
import { ExternalApiRegistry } from "@/components/admin/ExternalApiRegistry";

// Unified API & Secrets view:
//  1) Outbound webhook + internal API keys
//  2) External API Registry — track third-party APIs (name, usecase, url, key, remark, status) and refresh to verify
//  3) Project-level secrets
export const ApiAndWebhooksPanel = () => {
  return (
    <div className="space-y-8">
      <ApiKeysManager />
      <div className="border-t pt-6">
        <ExternalApiRegistry />
      </div>
      <div className="border-t pt-6">
        <SecretsManager />
      </div>
    </div>
  );
};
