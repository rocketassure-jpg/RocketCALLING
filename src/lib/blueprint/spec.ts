// Static catalog of Rocket CRM modules & screens — used to generate the
// "build prompt" markdown so a fresh AI builder can regenerate the app.

export const APP_META = {
  name: "Rocket CRM",
  tagline: "Insurance CRM for Life, Health & Motor — with WhatsApp chat and tele-calling",
  brandColor: "#e85d24",
  stack: ["React 18", "Vite 5", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase (Postgres + Auth + Storage + Edge Functions)"],
};

export const ROLES = [
  { key: "super_admin", label: "Super Admin", scope: "platform" },
  { key: "admin", label: "Admin (Company Owner)", scope: "company" },
  { key: "manager", label: "Manager / Team Lead", scope: "team" },
  { key: "telecaller", label: "Tele-caller / Agent", scope: "self" },
  { key: "sub_agent", label: "Sub Agent", scope: "self" },
];

export const MODULES = [
  { key: "leads", label: "Lead Capture", desc: "Capture, assign and disposition leads. Fields: customer_name, phone, city, source, status, assigned_telecaller, premium_amount, policy_expiry_date." },
  { key: "whatsapp", label: "WhatsApp Chat", desc: "2-way WhatsApp via Meta Business API. Templates, webhooks, bulk messaging, conversation log." },
  { key: "dialer", label: "Tele-Calling / Dialer", desc: "Click-to-call via Exotel/Knowlarity. Dispositions, call recording references, calling lists." },
  { key: "life", label: "Life Insurance", desc: "Life policies, nominees, premium schedules." },
  { key: "health", label: "Health Insurance", desc: "Health policies with member roster, sum-insured, network hospitals." },
  { key: "motor", label: "Motor Insurance", desc: "Motor policies, RC register, RTO services, expiry tracker, PUC, fitness, permits." },
  { key: "enquiries", label: "Enquiry Tracking", desc: "Inbound enquiry pipeline separate from leads." },
  { key: "renewals", label: "Renewals", desc: "Automated renewal queue, campaigns, templates, analytics." },
  { key: "claims", label: "Claims", desc: "Claim intake, status history, SLA tracking, documents." },
  { key: "marketing", label: "Marketing Automation", desc: "Campaigns, audiences, festivals, scheduled posts, channels (Meta/WA/SMS/Email)." },
  { key: "accounts", label: "Accounts & Commissions", desc: "Insurer master, commission rates, payouts (agent/broker), policy transactions, premium remittance." },
  { key: "reports", label: "Reports & Performance", desc: "Lead/Call/Renewal/Productivity/Financial/Policy reports + branch P&L." },
];

export const SCREENS_BY_ROLE: Record<string, string[]> = {
  super_admin: [
    "/super-admin — Companies, MRR, modules dashboard",
    "/super-admin → Data Explorer, Announcements, Global+Data Settings, Feature Flags, Plan Templates, Platform Secrets, Audit Log",
    "/super-admin/blueprint — Export blueprint, source, full system",
  ],
  admin: [
    "/admin — Overview, Customers Hub, Leads & Enquiries, Reports, Branches, Accounts, Brokers, Claims, Health/Life/Motor, Marketing, RTO, Renewals, Operations, Audit, Branding, Permissions, Masking, CRM Fields, Statuses, API & Webhooks, Smart Import",
  ],
  manager: ["/manager — Team performance, lead distribution, break logs, area assignments"],
  telecaller: ["/telecaller — Calling list, lead actions, WhatsApp chat, premium calculator, training"],
  sub_agent: ["/sub-agent — Limited lead view, enquiry submission"],
};

export const BUSINESS_RULES = [
  "Lead → Customer auto-conversion when status = 'won' (trigger lead_to_customer_on_won).",
  "Renewal auto-assign: prefers original telecaller if active, else default per admin_renewal_settings.",
  "Policy transaction auto-calc: net = OD+TP, GST = 18% of net, gross = net+gst, TDS = 5% commission (Sec 194D), agent_payout = commission − TDS.",
  "Broker slabs: pick highest commission_rate where amount in [slab_min, slab_max] and within effective dates.",
  "Claim SLA: 7 days health / 15 motor / 30 life from intimation_date; sla_breached auto-set after deadline if not closed.",
  "Privilege escalation guard: non-admins cannot modify is_super_admin, is_active, is_approved, company_id, manager_id on profiles.",
  "Mobile login: resolve_login_email() lets users sign in with phone instead of email.",
];

export const KEY_TABLES = [
  "companies, company_subscriptions, modules, plan_templates",
  "profiles, user_roles, branches, areas, telecaller_areas",
  "leads, lead_notes, lead_statuses, status_mappings, crm_fields, enquiries",
  "customers, customer_documents, call_logs, dial_logs, break_logs",
  "whatsapp_logs, wa_webhook_messages, message_templates, sms_logs",
  "life_policies, life_nominees, life_premium_schedule",
  "health_policies, health_policy_members",
  "motor_policies, vehicles, rc_register, rto_cases, rto_case_documents, rto_service_types, rto_status_history, puc_records, permits, fitness_certificates",
  "renewals, renewal_campaigns, renewal_templates, admin_renewal_settings",
  "claims, claim_documents, claim_status_history, complaints, service_requests",
  "insurers, brokers, broker_targets, broker_slabs, broker_payouts, broker_achievements, broker_company_mapping",
  "agents_profile, agent_payouts, commission_rates, policy_transactions, premium_remittance, expenses",
  "mkt_campaigns, mkt_audiences, mkt_templates, mkt_channels, mkt_festivals, mkt_scheduled_posts, mkt_auto_triggers, mkt_campaign_metrics, mkt_lead_routing_rules",
  "marketing_integrations, marketing_templates, campaign_logs, scheduled_posts, social_post_logs",
  "system_config, global_settings, feature_flags, app_settings, announcements, audit_logs, super_admin_audit_log, export_history",
  "api_keys, external_api_registry, webhook_events, whatsapp_bridge_settings",
];

export const INTEGRATIONS = [
  { name: "Meta WhatsApp Business API", secrets: ["META_WHATSAPP_TOKEN", "META_WHATSAPP_PHONE_ID"] },
  { name: "Twilio (SMS / Voice)", secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"] },
  { name: "Anthropic Claude (AI suggestions)", secrets: ["ANTHROPIC_API_KEY"] },
  { name: "Lovable AI Gateway (default LLM)", secrets: ["LOVABLE_API_KEY"] },
];
