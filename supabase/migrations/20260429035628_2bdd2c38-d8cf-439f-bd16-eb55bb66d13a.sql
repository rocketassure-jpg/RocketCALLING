
-- Training materials
CREATE TABLE public.training_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'text', -- 'text' | 'video' | 'image'
  content_type text NOT NULL DEFAULT 'youtube', -- 'youtube' | 'pdf' | 'note' | 'image'
  url text,
  body text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage training" ON public.training_materials
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth view training" ON public.training_materials
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_training_updated BEFORE UPDATE ON public.training_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WhatsApp logs
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  phone_number text NOT NULL,
  template text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view whatsapp logs" ON public.whatsapp_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sender view own whatsapp logs" ON public.whatsapp_logs
  FOR SELECT USING (auth.uid() = sent_by);
CREATE POLICY "Auth insert whatsapp logs" ON public.whatsapp_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sent_by);

-- SMS logs
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  phone_number text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sms logs" ON public.sms_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sender view own sms logs" ON public.sms_logs
  FOR SELECT USING (auth.uid() = sent_by);
CREATE POLICY "Auth insert sms logs" ON public.sms_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sent_by);

-- AI suggestions
CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  suggestion text NOT NULL,
  model text NOT NULL DEFAULT 'claude-3.5',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai suggestions" ON public.ai_suggestions
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Telecallers view ai for their leads" ON public.ai_suggestions
  FOR SELECT USING (EXISTS (SELECT 1 FROM leads l WHERE l.id = ai_suggestions.lead_id AND telecaller_has_area(auth.uid(), l.area_id)));
CREATE POLICY "Managers view ai for team leads" ON public.ai_suggestions
  FOR SELECT USING (has_role(auth.uid(), 'manager') AND EXISTS (SELECT 1 FROM leads l WHERE l.id = ai_suggestions.lead_id AND manager_can_see_lead(auth.uid(), l.area_id)));
CREATE POLICY "Auth insert ai suggestions" ON public.ai_suggestions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
