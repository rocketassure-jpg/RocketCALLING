import { ApiKeysManager } from "@/components/admin/ApiKeysManager";
import { SecretsManager } from "@/components/admin/SecretsManager";

// Single unified view: webhook/API keys at top, third-party secrets right below.
// Each secret card already shows label + key + purpose, so admins see exactly
// which integration uses which key — kept together in one safe place.
export const ApiAndWebhooksPanel = () => {
  return (
    <div className="space-y-8">
      <ApiKeysManager />
      <div className="border-t pt-6">
        <SecretsManager />
      </div>
    </div>
  );
};
