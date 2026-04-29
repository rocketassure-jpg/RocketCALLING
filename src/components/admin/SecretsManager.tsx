import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, KeyRound, AlertCircle } from "lucide-react";

// Note: This component does NOT store secrets in the DB. It only documents the
// secrets system for users and links them to the manager UI. All secret writes
// go through the protected secrets management flow handled by Lovable Cloud.
const SECRETS = [
  { key: "META_WHATSAPP_TOKEN", label: "Meta WhatsApp API Token", help: "Used for sending WhatsApp messages via Meta Cloud API." },
  { key: "META_WHATSAPP_PHONE_ID", label: "Meta WhatsApp Phone Number ID", help: "Phone number ID from Meta WhatsApp Business." },
  { key: "TWILIO_ACCOUNT_SID", label: "Twilio Account SID", help: "From your Twilio console." },
  { key: "TWILIO_AUTH_TOKEN", label: "Twilio Auth Token", help: "From your Twilio console." },
  { key: "TWILIO_FROM_NUMBER", label: "Twilio Sender Number", help: "E.164 format (e.g. +14155551234)." },
  { key: "ANTHROPIC_API_KEY", label: "Claude (Anthropic) API Key", help: "For AI 'Next Step' suggestions on leads." },
];

export const SecretsManager = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold">API Keys & Secrets</h2>
      </div>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Secrets are stored securely server-side.</p>
            <p className="text-muted-foreground">Use the Lovable Cloud secrets manager to add, update, or remove these values. They are never exposed to the browser.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {SECRETS.map((s) => (
          <Card key={s.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{s.label}</span>
                <Badge variant="outline" className="font-mono text-xs">{s.key}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{s.help}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="https://docs.lovable.dev/features/cloud" target="_blank" rel="noopener noreferrer">
                    Manage in Cloud <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">How to add or remove keys</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Open <strong>View Backend</strong> from the project menu.</p>
          <p>2. Go to <strong>Edge Functions → Secrets</strong>.</p>
          <p>3. Add a new secret with the exact key name shown above (case-sensitive).</p>
          <p>4. To remove, click the secret and choose <strong>Delete</strong>. The integration becomes inactive immediately.</p>
        </CardContent>
      </Card>
    </div>
  );
};
