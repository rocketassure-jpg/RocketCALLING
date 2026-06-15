# Rocket Marketing Automation Engine

This is a very large module (9 sub-modules, 7+ external API integrations, AI generation, scheduling, analytics). Shipping it in one go would take many hours and a lot of credits, and most external APIs (Meta, Google Ads, LinkedIn, GMB, X) require **your own developer accounts + app review + access tokens** before any code can actually post or fetch leads. So I'm proposing a phased rollout — each phase is independently usable.

I will follow the existing Rocketdial theme (dark, red/orange accents, the same shadcn + Tailwind tokens already used in `AdminDashboard`). New surface lives under **Admin → Marketing → Rocket Marketing Engine** as sub-tabs.

---

## Scope split

### Phase 1 — Foundation + Content Engine *(build now)*
Everything that works **without** waiting for third-party API approvals.

1. **DB schema** (one migration, company-scoped, RLS = company admin/manager + super admin):
   - `mkt_channels` — connected platform accounts (FB, IG, Threads, LinkedIn, WA, GMB, X) with status + token ref (token stored as secret name, not value)
   - `mkt_templates` — 50+ seeded post templates (festival, renewal, cross-sell, testimonial, educational, urgency, new product, RTO) with body + variables + category + language
   - `mkt_festivals` — Indian festival calendar (seeded for 2026-2027) with auto-campaign offset days
   - `mkt_scheduled_posts` — calendar entries (channel, scheduled_at, status, content, media_url, variables)
   - `mkt_audiences` — smart audience definitions (rule JSON, last_synced, member_count) — 5 seeded (Expiring 7d, Expiring 30d, Cross-Sell Health, New Vehicle, Lost)
   - `mkt_campaigns` — campaign shell (name, type, channels[], budget_daily, budget_monthly, cpl_limit, status, audience_id)
   - `mkt_campaign_metrics` — daily spend/leads/cpl/ctr (manual + later API-fed)
   - `mkt_lead_routing_rules` — city/pincode → agent priority list, score thresholds
   - `mkt_auto_triggers` — WhatsApp trigger templates (8 seeded: expiry 30/7/1, cross-sell, festival, new lead, quote sent, renewed)
   - All tables get GRANT + RLS + audit triggers + `updated_at`

2. **Frontend** `src/components/admin/marketing/rocket/`:
   - `RocketMarketingEngine.tsx` — shell with 9 tabs matching your spec
   - `ContentCalendarTab.tsx` — monthly calendar (react-day-picker grid) showing scheduled posts, click to edit, drag-to-reschedule
   - `TemplatesLibraryTab.tsx` — browse/edit/duplicate 50+ templates, preview per platform
   - `AIContentGeneratorTab.tsx` — input prompt → calls **Lovable AI Gateway** (`google/gemini-3-flash-preview`) via edge function → returns 5 copy variants + hashtags + best-time suggestion + per-platform preview + "Schedule all"
   - `ImageGeneratorTab.tsx` — Lovable AI image gen (`google/gemini-3.1-flash-image-preview`) with brand color overlay + contact + QR
   - `SmartAudiencesTab.tsx` — visual rule builder, live member count from CRM data, manual "Sync now"
   - `LeadRoutingTab.tsx` — distribution rules, scoring weights, escalation timers
   - `WhatsAppTriggersTab.tsx` — 8 trigger templates with edit + enable toggle (uses existing `whatsapp-bridge` function)
   - `AnalyticsTab.tsx` — dashboard cards (spend, leads, CPL, ROAS) + platform table + content performance
   - `ConnectedChannelsTab.tsx` — list of 7 platforms with Connect / Disconnected / Pending status badges, "Add credentials" CTA that documents what each API needs

3. **Edge functions** (Lovable Cloud):
   - `mkt-ai-content` — generates post copy/hashtags via Lovable AI
   - `mkt-ai-image` — generates branded post image via Lovable AI image model, uploads to `customer-docs` storage
   - `mkt-audience-sync` — recomputes audience member lists from `customers`/`renewals`/`policy_transactions` (cron daily)
   - `mkt-scheduled-runner` — cron every 5 min, picks due posts, currently logs + marks "ready" (actual platform POST in Phase 2)

4. **Settings**:
   - Festival calendar editor pre-seeded
   - Notification settings (new lead → agent WhatsApp, hot lead → manager, budget 80% → admin email)
   - Budget alert thresholds

5. **Integration with existing CRM**:
   - "New lead" trigger fires from existing `leads` insert (DB trigger → enqueue WA via existing bridge)
   - Cross-sell detector view over `customers` + `policy_transactions`
   - Lead score column added to `leads`

### Phase 2 — Platform API connectors *(only after you provide credentials)*
For each platform you'll need to provide developer app credentials (I'll request them via the secrets flow when you're ready):
- **Meta** (FB Page + IG Business + Threads + WA Business + Lead Ads): App ID, App Secret, long-lived Page token, WABA ID, Phone Number ID
- **Google** (Ads + GMB): OAuth client + refresh token + Ads developer token + manager account ID
- **LinkedIn**: Client ID/Secret + Company URN + 3-legged OAuth
- **X/Twitter**: Consumer key/secret + access token/secret (see twitter knowledge — must use `api.x.com`, Read+Write app)

Each connector becomes its own edge function (`mkt-publish-meta`, `mkt-publish-google`, etc.) wired into `mkt-scheduled-runner`. Lead-form webhooks land on `mkt-webhook-{platform}` and create CRM leads.

### Phase 3 — Paid Ads automation, Lookalike, A/B optimizer, GMB review auto-reply
Built on top of Phase 2 once basic publishing works.

---

## What I will NOT do
- Won't fake "connected" status for platforms whose credentials don't exist — they'll show "Not connected" with clear setup steps.
- Won't add Canva API (Lovable AI image gen covers the same use case without a paid Canva account).
- Won't store any external API token in code or `.env` — all go through the secrets flow.

---

## Confirmation needed

1. **Proceed with Phase 1 now?** (~1 big migration + ~12 new files + 4 edge functions). This gives you a working calendar, AI content+image generation, audience builder, lead routing, WhatsApp triggers, and analytics shell — all without external API setup.
2. **Language for AI-generated content** — Hinglish (like your examples) as default? I'll add EN / HI toggles too.
3. Reply "go" to start Phase 1, or tell me which sub-modules to drop/reorder.
