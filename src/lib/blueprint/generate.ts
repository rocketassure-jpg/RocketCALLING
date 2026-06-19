import { supabase } from "@/integrations/supabase/client";
import { APP_META, ROLES, MODULES, SCREENS_BY_ROLE, BUSINESS_RULES, KEY_TABLES, INTEGRATIONS } from "./spec";

const h = (n: number, t: string) => `${"#".repeat(n)} ${t}\n`;
const li = (s: string) => `- ${s}\n`;

export async function generateBlueprintMarkdown(): Promise<string> {
  const [{ data: subs }, { data: flags }, { data: crmFields }, { data: statuses }, { data: cfg }] = await Promise.all([
    supabase.from("company_subscriptions").select("module_key,status,billing_cycle,company_id"),
    supabase.from("feature_flags").select("flag_key,is_enabled,description,company_id"),
    supabase.from("crm_fields").select("*").limit(500),
    supabase.from("status_mappings").select("label,color,is_active,sort_order").order("sort_order"),
    supabase.from("system_config").select("key_name,key_value,is_secret"),
  ]);

  const activeModules = Array.from(new Set((subs ?? []).filter(s => s.status === "active").map(s => s.module_key)));
  const globalFlags = (flags ?? []).filter(f => !f.company_id);
  const appName = (cfg ?? []).find((c: any) => c.key_name === "APP_NAME")?.key_value ?? APP_META.name;
  const brandColor = (cfg ?? []).find((c: any) => c.key_name === "BRAND_COLOR")?.key_value ?? APP_META.brandColor;
  const version = (cfg ?? []).find((c: any) => c.key_name === "APP_VERSION")?.key_value ?? "1.0.0";

  let md = "";
  md += h(1, `${appName} — Build Blueprint`);
  md += `> ${APP_META.tagline}\n\n`;
  md += `**Version:** ${version}  •  **Brand:** ${brandColor}  •  **Generated:** ${new Date().toISOString()}\n\n`;
  md += `Paste this entire document into any AI app builder (Lovable, Bolt, Cursor, v0, Replit) to regenerate the app from scratch.\n\n`;

  md += h(2, "1. Stack");
  APP_META.stack.forEach(s => md += li(s));
  md += "\n";

  md += h(2, "2. Roles");
  ROLES.forEach(r => md += li(`**${r.label}** (\`${r.key}\`) — scope: ${r.scope}`));
  md += "\n";

  md += h(2, "3. Modules");
  MODULES.forEach(m => {
    const enabled = activeModules.includes(m.key);
    md += `### ${m.label} \`${m.key}\` ${enabled ? "✅ enabled (default)" : "⚪ optional"}\n${m.desc}\n\n`;
  });

  md += h(2, "4. Screens by Role");
  for (const [role, screens] of Object.entries(SCREENS_BY_ROLE)) {
    md += `**${role}:**\n`;
    screens.forEach(s => md += li(s));
    md += "\n";
  }

  md += h(2, "5. Business Rules & Triggers");
  BUSINESS_RULES.forEach(r => md += li(r));
  md += "\n";

  md += h(2, "6. Database — Core Tables");
  KEY_TABLES.forEach(t => md += li(t));
  md += "\n";

  if (crmFields && crmFields.length) {
    md += h(2, "7. Custom CRM Fields (live)");
    crmFields.forEach((f: any) => md += li(`\`${f.field_key}\` — ${f.field_type} ${f.is_required ? "(required)" : ""}`));
    md += "\n";
  }

  if (statuses && statuses.length) {
    md += h(2, "8. Lead Dispositions (live)");
    statuses.forEach((s: any) => md += li(`${s.label} — color ${s.color} ${s.is_active ? "" : "(inactive)"}`));
    md += "\n";
  }

  md += h(2, "9. Feature Flags (global defaults)");
  if (globalFlags.length) {
    globalFlags.forEach((f: any) => md += li(`\`${f.flag_key}\` — ${f.is_enabled ? "ON" : "OFF"} — ${f.description ?? ""}`));
  } else md += "_None defined._\n";
  md += "\n";

  md += h(2, "10. Required Integrations & Secrets");
  INTEGRATIONS.forEach(i => {
    md += `**${i.name}** — secrets: ${i.secrets.map(s => `\`${s}\``).join(", ")}\n\n`;
  });

  md += h(2, "11. Security Model");
  md += li("Row-Level Security on every public table.");
  md += li("Roles stored in separate `user_roles` table; checked via `has_role()` security-definer function.");
  md += li("`is_super_admin` flag on profiles, checked via `is_super_admin()`.");
  md += li("Company isolation via `user_company_id()` in every policy.");
  md += li("Mobile-or-email login via `resolve_login_email()` RPC.");
  md += "\n";

  md += h(2, "12. Re-create instructions");
  md += "1. Spin up a Supabase project (or Lovable Cloud).\n";
  md += "2. Run the schema SQL bundled in `/database/schema.sql`.\n";
  md += "3. Restore data from `/database/*.csv`.\n";
  md += "4. Re-add the secrets listed in section 10 (excluded from export for security).\n";
  md += "5. Deploy the React/Vite frontend (see `/code/README.md`).\n";
  md += "6. Reconnect Meta WhatsApp + Twilio webhooks to the new edge function URLs.\n";

  return md;
}

export function downloadText(filename: string, contents: string, mime = "text/markdown") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
