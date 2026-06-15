
-- ============ MARKETING AUTOMATION ENGINE - PHASE 1 ============

-- 1. CHANNELS
CREATE TABLE public.mkt_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- facebook, instagram, threads, linkedin, whatsapp, gmb, twitter
  display_name TEXT,
  account_handle TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected, disconnected, pending, error
  secret_ref TEXT, -- name of secret that holds token; never the token itself
  config JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_channels TO authenticated;
GRANT ALL ON public.mkt_channels TO service_role;
ALTER TABLE public.mkt_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_channels company admin manage" ON public.mkt_channels FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));
CREATE POLICY "mkt_channels company read" ON public.mkt_channels FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());

-- 2. TEMPLATES
CREATE TABLE public.mkt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- festival, renewal, cross_sell, testimonial, educational, urgency, new_product, rto
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hashtags TEXT,
  language TEXT NOT NULL DEFAULT 'hinglish',
  variables JSONB DEFAULT '[]'::jsonb,
  default_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_templates TO authenticated;
GRANT ALL ON public.mkt_templates TO service_role;
ALTER TABLE public.mkt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_templates read" ON public.mkt_templates FOR SELECT TO authenticated
  USING (is_system OR company_id = public.user_company_id());
CREATE POLICY "mkt_templates manage" ON public.mkt_templates FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));

-- 3. FESTIVALS
CREATE TABLE public.mkt_festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  festival_date DATE NOT NULL,
  campaign_offset_days INT NOT NULL DEFAULT 3,
  preferred_post_time TIME DEFAULT '10:00',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_festivals TO authenticated;
GRANT ALL ON public.mkt_festivals TO service_role;
ALTER TABLE public.mkt_festivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_festivals read" ON public.mkt_festivals FOR SELECT TO authenticated
  USING (is_system OR company_id = public.user_company_id());
CREATE POLICY "mkt_festivals manage" ON public.mkt_festivals FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));

-- 4. SCHEDULED POSTS
CREATE TABLE public.mkt_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.mkt_templates(id) ON DELETE SET NULL,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, ready, published, failed, cancelled
  publish_result JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mkt_scheduled_posts_due ON public.mkt_scheduled_posts (status, scheduled_at);
CREATE INDEX idx_mkt_scheduled_posts_company ON public.mkt_scheduled_posts (company_id, scheduled_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_scheduled_posts TO authenticated;
GRANT ALL ON public.mkt_scheduled_posts TO service_role;
ALTER TABLE public.mkt_scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_scheduled_posts read" ON public.mkt_scheduled_posts FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_scheduled_posts manage" ON public.mkt_scheduled_posts FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- 5. AUDIENCES
CREATE TABLE public.mkt_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'customers', -- customers, renewals, leads
  member_count INT NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_audiences TO authenticated;
GRANT ALL ON public.mkt_audiences TO service_role;
ALTER TABLE public.mkt_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_audiences read" ON public.mkt_audiences FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_audiences manage" ON public.mkt_audiences FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- 6. CAMPAIGNS
CREATE TABLE public.mkt_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- renewal, new_customer, cross_sell, rto, festival
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  audience_id UUID REFERENCES public.mkt_audiences(id) ON DELETE SET NULL,
  budget_daily NUMERIC(12,2) DEFAULT 0,
  budget_monthly NUMERIC(12,2) DEFAULT 0,
  cpl_limit NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_campaigns TO authenticated;
GRANT ALL ON public.mkt_campaigns TO service_role;
ALTER TABLE public.mkt_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_campaigns read" ON public.mkt_campaigns FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_campaigns manage" ON public.mkt_campaigns FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- 7. CAMPAIGN METRICS
CREATE TABLE public.mkt_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.mkt_campaigns(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  platform TEXT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  leads INT DEFAULT 0,
  conversions INT DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, metric_date, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_campaign_metrics TO authenticated;
GRANT ALL ON public.mkt_campaign_metrics TO service_role;
ALTER TABLE public.mkt_campaign_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_campaign_metrics read" ON public.mkt_campaign_metrics FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_campaign_metrics manage" ON public.mkt_campaign_metrics FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- 8. LEAD ROUTING RULES
CREATE TABLE public.mkt_lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  pincode TEXT,
  product TEXT,
  agent_priority UUID[] DEFAULT ARRAY[]::UUID[],
  fallback_user_id UUID,
  max_pending_per_agent INT DEFAULT 5,
  hot_threshold INT DEFAULT 50,
  warm_threshold INT DEFAULT 30,
  escalate_after_min INT DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_lead_routing_rules TO authenticated;
GRANT ALL ON public.mkt_lead_routing_rules TO service_role;
ALTER TABLE public.mkt_lead_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_lead_routing read" ON public.mkt_lead_routing_rules FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_lead_routing manage" ON public.mkt_lead_routing_rules FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.is_super_admin(auth.uid())));

-- 9. AUTO TRIGGERS (WhatsApp / multi-channel)
CREATE TABLE public.mkt_auto_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL, -- expiry_30, expiry_7, expiry_1, cross_sell_health, festival, new_lead, quote_sent, policy_renewed
  label TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, trigger_key, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mkt_auto_triggers TO authenticated;
GRANT ALL ON public.mkt_auto_triggers TO service_role;
ALTER TABLE public.mkt_auto_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_auto_triggers read" ON public.mkt_auto_triggers FOR SELECT TO authenticated
  USING (company_id = public.user_company_id());
CREATE POLICY "mkt_auto_triggers manage" ON public.mkt_auto_triggers FOR ALL TO authenticated
  USING (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())))
  WITH CHECK (company_id = public.user_company_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.is_super_admin(auth.uid())));

-- updated_at triggers
CREATE TRIGGER trg_mkt_channels_uat BEFORE UPDATE ON public.mkt_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_templates_uat BEFORE UPDATE ON public.mkt_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_festivals_uat BEFORE UPDATE ON public.mkt_festivals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_scheduled_posts_uat BEFORE UPDATE ON public.mkt_scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_audiences_uat BEFORE UPDATE ON public.mkt_audiences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_campaigns_uat BEFORE UPDATE ON public.mkt_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_campaign_metrics_uat BEFORE UPDATE ON public.mkt_campaign_metrics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_lead_routing_uat BEFORE UPDATE ON public.mkt_lead_routing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mkt_auto_triggers_uat BEFORE UPDATE ON public.mkt_auto_triggers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lead score column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_temperature TEXT; -- hot, warm, cold

-- ============ SEED SYSTEM DATA ============

-- Festivals 2026-2027
INSERT INTO public.mkt_festivals (name, festival_date, campaign_offset_days, preferred_post_time, is_system) VALUES
('New Year', '2026-01-01', 3, '10:00', true),
('Republic Day', '2026-01-26', 3, '10:00', true),
('Holi', '2026-03-04', 3, '10:00', true),
('Good Friday', '2026-04-03', 2, '10:00', true),
('Akshaya Tritiya', '2026-04-29', 3, '10:00', true),
('Independence Day', '2026-08-15', 3, '10:00', true),
('Raksha Bandhan', '2026-08-28', 3, '10:00', true),
('Janmashtami', '2026-09-04', 3, '10:00', true),
('Ganesh Chaturthi', '2026-09-14', 3, '10:00', true),
('Dussehra', '2026-10-20', 3, '10:00', true),
('Diwali', '2026-11-08', 5, '10:00', true),
('Christmas', '2026-12-25', 5, '10:00', true),
('New Year', '2027-01-01', 3, '10:00', true),
('Republic Day', '2027-01-26', 3, '10:00', true),
('Holi', '2027-03-23', 3, '10:00', true);

-- 50+ system templates
INSERT INTO public.mkt_templates (category, title, body, hashtags, language, default_channels, is_system) VALUES
-- Festival (10)
('festival','Diwali Dhamaka 20%','🪔 Diwali Dhamaka Offer! 🪔
Motor Insurance pe FLAT 20% OFF!
✅ NCB bachao  ✅ Zero Dep free  ✅ 24x7 RSA
📞 Call now: {phone}
⏰ Valid till Diwali only!','#DiwaliOffer #MotorInsurance #Insurance','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('festival','Holi Color Offer','🎨 Holi pe rangeen offer!
Motor + Health combo pe 25% OFF!
📞 {phone}','#HoliOffer #Insurance','hinglish',ARRAY['facebook','instagram'],true),
('festival','New Year Resolution','🎉 Naya Saal, Nayi Suraksha!
Family ke liye health insurance lijiye - 15% off.
📞 {phone}','#NewYear #HealthInsurance','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('festival','Independence Day Offer','🇮🇳 Azaadi ka jashn!
Motor insurance pe 15% off + free RSA.
📞 {phone}','#IndependenceDay #Insurance','hinglish',ARRAY['facebook','instagram'],true),
('festival','Republic Day Sale','🇮🇳 Republic Day Special!
Health cover ₹5L sirf ₹6,000 mein!
📞 {phone}','#RepublicDay #HealthInsurance','hinglish',ARRAY['facebook','instagram'],true),
('festival','Raksha Bandhan','🎗️ Behen ki suraksha aapke haath!
Family floater health policy 20% off.
📞 {phone}','#RakshaBandhan #FamilyCover','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('festival','Ganesh Chaturthi','🙏 Ganpati Bappa Morya!
Vehicle insurance renew karwaiye - lucky offer 18% off.
📞 {phone}','#GaneshChaturthi','hinglish',ARRAY['facebook','instagram'],true),
('festival','Dussehra Win','🏹 Buraai par jeet, risk par bhi jeet!
Motor + accident cover 22% off.
📞 {phone}','#Dussehra','hinglish',ARRAY['facebook','instagram'],true),
('festival','Christmas Cheer','🎄 Merry Christmas!
Gift your family health cover at 18% off.
📞 {phone}','#Christmas','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('festival','Akshaya Tritiya','✨ Akshaya Tritiya - shubh din!
Naya policy lijiye, lifetime NCB suraksha.
📞 {phone}','#AkshayaTritiya','hinglish',ARRAY['facebook','instagram'],true),
-- Renewal (8)
('renewal','7 Day Reminder','⏰ Sirf 7 din bache hain!
{vehicle} ka bima {expiry_date} ko khatam.
NCB {ncb}% bachaiye - abhi renew karein.
📞 {phone}','#Renewal #NCB','hinglish',ARRAY['whatsapp','facebook'],true),
('renewal','30 Day Reminder','📅 30 din mein expire!
{vehicle} ka policy {expiry_date} ko khatam.
Renew karein aur 10% early bird discount paayein.
📞 {phone}','#Renewal','hinglish',ARRAY['whatsapp'],true),
('renewal','1 Day Last Chance','🚨 LAST CHANCE!
Kal aapka bima khatam ho raha hai.
Abhi call karein: {phone}','#Urgent #Renewal','hinglish',ARRAY['whatsapp'],true),
('renewal','Lapsed Win-Back','😟 Aapki policy lapse ho gayi!
30 din ka grace period chal raha hai - jaldi renew karein.
📞 {phone}','#WinBack','hinglish',ARRAY['whatsapp','facebook'],true),
('renewal','NCB Save','💰 NCB bachao - ₹{ncb_amount} ki bachat!
Aaj hi renew: {phone}','#NCB #Save','hinglish',ARRAY['whatsapp'],true),
('renewal','Health Renew','🩺 Health policy expire ho rahi hai.
Continuity benefit miss mat kijiye.
📞 {phone}','#HealthRenewal','hinglish',ARRAY['whatsapp','facebook'],true),
('renewal','Premium Hike Warning','⚠️ Aaj renew karein - kal premium badhne wala hai!
📞 {phone}','#Renewal','hinglish',ARRAY['whatsapp'],true),
('renewal','Multi-year Save','💡 3-year policy lijiye, 30% bachao.
📞 {phone}','#MultiYear','hinglish',ARRAY['whatsapp','facebook'],true),
-- Cross-sell (8)
('cross_sell','Motor + Health Bundle','Motor ke saath health lijiye - family safe!
15% combo discount.
📞 {phone}','#CrossSell #Health','hinglish',ARRAY['whatsapp','facebook','instagram'],true),
('cross_sell','Term Plan Pitch','💼 Sirf ₹500/month mein ₹1 crore term plan!
Family ki suraksha aapke haath.
📞 {phone}','#TermInsurance','hinglish',ARRAY['facebook','instagram'],true),
('cross_sell','Accident Cover','🛡️ Personal Accident Cover ₹10L sirf ₹399/year!
📞 {phone}','#PersonalAccident','hinglish',ARRAY['whatsapp','facebook'],true),
('cross_sell','Home Insurance','🏠 Ghar ki suraksha - home insurance ₹2,000/year se shuru.
📞 {phone}','#HomeInsurance','hinglish',ARRAY['facebook'],true),
('cross_sell','Travel Cover','✈️ Travelling? Travel insurance ₹99 se shuru!
📞 {phone}','#TravelInsurance','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('cross_sell','Critical Illness','💊 Critical illness cover ₹10L sirf ₹3,000/year.
📞 {phone}','#CriticalIllness','hinglish',ARRAY['facebook','whatsapp'],true),
('cross_sell','Senior Citizen','👴 Parents ke liye senior citizen health plan.
📞 {phone}','#SeniorCitizen','hinglish',ARRAY['whatsapp','facebook'],true),
('cross_sell','Two Wheeler Add-on','🛵 2-wheeler hai? Zero Dep + RSA combo sirf ₹999.
📞 {phone}','#TwoWheeler','hinglish',ARRAY['facebook','whatsapp'],true),
-- Testimonial (5)
('testimonial','Customer Review 5⭐','⭐⭐⭐⭐⭐
"Claim 3 din mein settle ho gaya!" - {customer_name}, {city}
Aapka bhi number aa sakta hai 📞 {phone}','#Testimonial','hinglish',ARRAY['facebook','instagram'],true),
('testimonial','Claim Story','💪 "Accident ke baad poori family ka bharosa aapke saath." - {customer_name}','#ClaimStory','hinglish',ARRAY['facebook','instagram'],true),
('testimonial','Renewal Loyalty','🏆 "5 saal se aapke saath, kabhi shikayat nahi." - {customer_name}','#Loyalty','hinglish',ARRAY['facebook','instagram'],true),
('testimonial','Quick Service','⚡ "Quote 2 minute mein, policy 5 minute mein!" - {customer_name}','#QuickService','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('testimonial','Family Trust','👨‍👩‍👧 "Poori family same advisor ke saath." - {customer_name}','#FamilyTrust','hinglish',ARRAY['facebook','instagram'],true),
-- Educational (8)
('educational','5 Checks Before Policy','📚 Policy lene se pehle 5 cheezein check karein:
1. IDV
2. Add-ons
3. Claim ratio
4. Network garages
5. Exclusions','#InsuranceEducation','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('educational','What is IDV','💡 IDV kya hai?
IDV = Insured Declared Value = aapki gaadi ki current market value. Claim ki max limit.','#IDV','hinglish',ARRAY['facebook','instagram'],true),
('educational','NCB Explained','💡 NCB = No Claim Bonus
Har claim-free saal ka reward - premium pe 20% tak discount!','#NCB','hinglish',ARRAY['facebook','instagram'],true),
('educational','Zero Dep Worth It?','💡 Zero Dep cover lena chahiye?
Haan, agar gaadi nayi (< 5 saal) ho. Full claim amount milta hai.','#ZeroDep','hinglish',ARRAY['facebook','instagram'],true),
('educational','Claim Process','📋 Claim kaise file karein?
1. Insurer ko inform karein (24h)
2. FIR (theft/accident)
3. Surveyor inspection
4. Estimate submit
5. Approval & repair','#ClaimProcess','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('educational','Health Co-payment','💡 Co-payment kya hai?
Aap aur insurer claim share karte ho - usually 10-20%. Senior plans mein common.','#HealthInsurance','hinglish',ARRAY['facebook','instagram'],true),
('educational','PUC Importance','🚗 PUC = Pollution Under Control
Insurance renewal ke liye zaroori. Fine: ₹10,000.','#PUC','hinglish',ARRAY['facebook','instagram'],true),
('educational','Section 80D','💰 Health insurance = tax bachat!
Section 80D ke under ₹25,000 (self) + ₹50,000 (parents) tak deduction.','#TaxSaving #80D','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
-- Urgency (5)
('urgency','3 Days Left','🔥 Sirf 3 din bache! Premium 15% badhne wala hai.
📞 {phone}','#Urgent','hinglish',ARRAY['whatsapp','facebook'],true),
('urgency','Offer Ending Tonight','⏰ Offer aaj raat 12 baje khatam!
📞 {phone}','#LimitedTime','hinglish',ARRAY['whatsapp','facebook','instagram'],true),
('urgency','Last 50 Slots','🚨 Last 50 slots iss month ka!
20% off offer mein.
📞 {phone}','#LastChance','hinglish',ARRAY['facebook','instagram'],true),
('urgency','24 Hour Flash','⚡ 24-hour FLASH SALE!
Motor insurance pe 25% off.
📞 {phone}','#FlashSale','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('urgency','Weekend Only','🎯 Iss weekend special - 18% off.
📞 {phone}','#WeekendOffer','hinglish',ARRAY['facebook','instagram'],true),
-- New Product (4)
('new_product','New Plan Launch','🎉 New launch: {insurer} {plan_name}!
Premium kam, cover zyada.
📞 {phone}','#NewLaunch','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('new_product','Bajaj Allianz New','🚀 Bajaj Allianz ka naya motor plan launch!
24x7 claim assistance + zero paperwork.
📞 {phone}','#BajajAllianz','hinglish',ARRAY['facebook','instagram'],true),
('new_product','HDFC Ergo New','🩺 HDFC ERGO ka naya health plan - OPD included!
📞 {phone}','#HDFCErgo','hinglish',ARRAY['facebook','instagram'],true),
('new_product','EV Insurance','⚡ EV insurance launch - battery cover included!
📞 {phone}','#EVInsurance','hinglish',ARRAY['facebook','instagram'],true),
-- RTO (5)
('rto','RC Transfer','📋 RC transfer sirf ₹2,500 mein!
Door step service.
📞 {phone}','#RTOService','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('rto','Fitness Certificate','🚌 Commercial vehicle fitness certificate - 1 din mein!
📞 {phone}','#Fitness','hinglish',ARRAY['facebook','whatsapp'],true),
('rto','Permit Renewal','📑 Permit renewal hassle-free.
₹3,000 se shuru.
📞 {phone}','#Permit','hinglish',ARRAY['facebook','whatsapp'],true),
('rto','HSRP Plate','🔢 HSRP number plate booking - ghar baithe!
📞 {phone}','#HSRP','hinglish',ARRAY['facebook','instagram','whatsapp'],true),
('rto','Duplicate RC','📄 Duplicate RC sirf 7 din mein.
📞 {phone}','#DuplicateRC','hinglish',ARRAY['facebook','whatsapp'],true);

-- Per-company seeds for each existing company: 5 audiences + 8 auto triggers
INSERT INTO public.mkt_audiences (company_id, name, description, rules, source)
SELECT c.id, x.name, x.description, x.rules::jsonb, x.source
FROM public.companies c
CROSS JOIN (VALUES
  ('Expiring in 7 Days','Customers with policy expiring in next 7 days','{"expiry_within_days":7}','renewals'),
  ('Expiring in 30 Days','Expiring in 8-30 days','{"expiry_within_days":30,"expiry_after_days":8}','renewals'),
  ('Cross-Sell Health','Motor customers without health policy','{"has_motor":true,"has_health":false,"age_min":25,"age_max":55}','customers'),
  ('New Vehicle Buyers','Recently added vehicle owners','{"customer_added_days":30}','customers'),
  ('Lost Customers','Policies not renewed in last 30 days','{"lapsed_days":30}','renewals')
) AS x(name,description,rules,source);

INSERT INTO public.mkt_auto_triggers (company_id, trigger_key, label, channel, message_body) 
SELECT c.id, x.trigger_key, x.label, 'whatsapp', x.message_body
FROM public.companies c
CROSS JOIN (VALUES
  ('expiry_30','Policy Expiry 30 Days','Namaste {name} ji, aapka {vehicle} ka bima {expiry_date} ko khatam ho raha hai. Renewal karwaiye aur NCB bachaiye! Click: {link}'),
  ('expiry_7','Policy Expiry 7 Days','URGENT! Sirf 7 din bache hain. Aapka NCB {ncb}% chala jayega. Call karein: {phone}'),
  ('expiry_1','Policy Expiry 1 Day','LAST CHANCE! Kal aapka bima khatam. Abhi call karein: {phone}'),
  ('cross_sell_health','Cross-Sell Health','Sir, aapka motor insurance active hai. Health insurance bhi lein - family safe rahegi. 15% discount: {link}'),
  ('festival','Festival Greeting','Happy {festival}! Special offer - motor insurance pe 20% off. Valid till today: {link}'),
  ('new_lead','New Lead Acknowledgement','Thank you for your interest! Hamara agent aapko 10 minute mein call karega. Query: {product}'),
  ('quote_sent','Quote Sent','Aapka quote taiyaar hai! Premium: ₹{amount}. Pay karne ke liye click: {payment_link}'),
  ('policy_renewed','Policy Renewed','Congratulations! Aapka policy renew ho gaya. Policy number: {policy_no}. Download: {link}')
) AS x(trigger_key,label,message_body);

-- Pre-create disconnected channel rows per company for the 7 platforms
INSERT INTO public.mkt_channels (company_id, platform, display_name, status)
SELECT c.id, p.platform, p.display_name, 'disconnected'
FROM public.companies c
CROSS JOIN (VALUES
  ('facebook','Facebook Page'),
  ('instagram','Instagram Business'),
  ('threads','Threads'),
  ('linkedin','LinkedIn Company'),
  ('whatsapp','WhatsApp Business'),
  ('gmb','Google My Business'),
  ('twitter','X / Twitter')
) AS p(platform, display_name);
