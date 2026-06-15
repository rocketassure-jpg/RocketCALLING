import { ApiKeysManager } from "@/components/admin/ApiKeysManager";
import { ExternalApiRegistry } from "@/components/admin/ExternalApiRegistry";

// Company-admin API view:
//  1) Outbound webhooks + internal API keys
//  2) External API Registry — company's own third-party API credentials (managed by company admin)
// Note: Platform-level secrets are managed by Super Admin only.
export const ApiAndWebhooksPanel = () => {
  return (
    <div className="space-y-8">
      <ApiKeysManager />
      <div className="border-t pt-6">
        <ExternalApiRegistry />
      </div>
    </div>
  );
};
