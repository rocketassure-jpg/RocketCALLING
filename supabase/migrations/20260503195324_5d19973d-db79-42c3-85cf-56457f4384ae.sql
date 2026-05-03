ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Quote Sent';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Premium Quoted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Negotiation';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'Converted';