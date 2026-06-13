
-- ============ BROKERS ============
CREATE TABLE public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  pan TEXT,
  gstin TEXT,
  agreement_start DATE,
  agreement_end DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active|inactive|suspended
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_brokers_company ON public.brokers(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brokers TO authenticated;
GRANT ALL ON public.brokers TO service_role;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers_select" ON public.brokers FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "brokers_insert" ON public.brokers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "brokers_update" ON public.brokers FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "brokers_delete" ON public.brokers FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')));
CREATE TRIGGER brokers_updated BEFORE UPDATE ON public.brokers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BROKER ↔ INSURER MAPPING ============
CREATE TABLE public.broker_company_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  insurer_id UUID NOT NULL REFERENCES public.insurers(id) ON DELETE CASCADE,
  broker_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, insurer_id)
);
CREATE INDEX idx_bcm_broker ON public.broker_company_mapping(broker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_company_mapping TO authenticated;
GRANT ALL ON public.broker_company_mapping TO service_role;
ALTER TABLE public.broker_company_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bcm_select" ON public.broker_company_mapping FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bcm_insert" ON public.broker_company_mapping FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "bcm_update" ON public.broker_company_mapping FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bcm_delete" ON public.broker_company_mapping FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

-- ============ BROKER TARGETS ============
CREATE TABLE public.broker_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  product_category TEXT NOT NULL, -- Life|Health|Motor|General
  period_type TEXT NOT NULL,      -- monthly|quarterly|yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bt_broker_cat_period ON public.broker_targets(broker_id, product_category, period_start, period_end);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_targets TO authenticated;
GRANT ALL ON public.broker_targets TO service_role;
ALTER TABLE public.broker_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_select" ON public.broker_targets FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bt_insert" ON public.broker_targets FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "bt_update" ON public.broker_targets FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bt_delete" ON public.broker_targets FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER bt_updated BEFORE UPDATE ON public.broker_targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BROKER SLABS ============
CREATE TABLE public.broker_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.broker_targets(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  slab_min NUMERIC(14,2) NOT NULL DEFAULT 0,
  slab_max NUMERIC(14,2), -- NULL = open-ended
  commission_rate NUMERIC(6,3) NOT NULL, -- percent
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bs_target ON public.broker_slabs(target_id);
CREATE INDEX idx_bs_broker_eff ON public.broker_slabs(broker_id, effective_from);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_slabs TO authenticated;
GRANT ALL ON public.broker_slabs TO service_role;
ALTER TABLE public.broker_slabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_select" ON public.broker_slabs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bs_insert" ON public.broker_slabs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "bs_update" ON public.broker_slabs FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bs_delete" ON public.broker_slabs FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE TRIGGER bs_updated BEFORE UPDATE ON public.broker_slabs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BROKER ACHIEVEMENTS ============
CREATE TABLE public.broker_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.broker_targets(id) ON DELETE CASCADE,
  achieved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_id)
);
CREATE INDEX idx_ba_broker ON public.broker_achievements(broker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_achievements TO authenticated;
GRANT ALL ON public.broker_achievements TO service_role;
ALTER TABLE public.broker_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_select" ON public.broker_achievements FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "ba_insert" ON public.broker_achievements FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "ba_update" ON public.broker_achievements FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "ba_delete" ON public.broker_achievements FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());

-- ============ BROKER PAYOUTS ============
CREATE TABLE public.broker_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  expected_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  received_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  utr_number TEXT,
  payout_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|received|discrepancy
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bp_broker ON public.broker_payouts(broker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker_payouts TO authenticated;
GRANT ALL ON public.broker_payouts TO service_role;
ALTER TABLE public.broker_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_select" ON public.broker_payouts FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bp_insert" ON public.broker_payouts FOR INSERT TO authenticated
  WITH CHECK (company_id = public.user_company_id());
CREATE POLICY "bp_update" ON public.broker_payouts FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR company_id = public.user_company_id());
CREATE POLICY "bp_delete" ON public.broker_payouts FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (company_id = public.user_company_id() AND public.has_role(auth.uid(),'admin')));
CREATE TRIGGER bp_updated BEFORE UPDATE ON public.broker_payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Hook into policy_transactions ============
ALTER TABLE public.policy_transactions ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pt_broker ON public.policy_transactions(broker_id);

-- ============ Slab pick function ============
CREATE OR REPLACE FUNCTION public.get_applicable_slab(
  _broker_id UUID,
  _category TEXT,
  _amount NUMERIC,
  _on_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(slab_id UUID, target_id UUID, commission_rate NUMERIC, slab_min NUMERIC, slab_max NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.target_id, s.commission_rate, s.slab_min, s.slab_max
  FROM public.broker_slabs s
  LEFT JOIN public.broker_targets t ON t.id = s.target_id
  WHERE s.broker_id = _broker_id
    AND (t.id IS NULL OR t.product_category = _category)
    AND s.effective_from <= _on_date
    AND (s.effective_to IS NULL OR s.effective_to >= _on_date)
    AND _amount >= s.slab_min
    AND (s.slab_max IS NULL OR _amount <= s.slab_max)
  ORDER BY s.commission_rate DESC
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_applicable_slab(UUID,TEXT,NUMERIC,DATE) FROM anon;

-- ============ Achievement updater trigger ============
CREATE OR REPLACE FUNCTION public.update_broker_achievement_from_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tgt UUID;
  _delta NUMERIC;
BEGIN
  -- Reverse old contribution
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.broker_id IS NOT NULL THEN
    SELECT id INTO _tgt FROM public.broker_targets
      WHERE broker_id = OLD.broker_id
        AND OLD.txn_date BETWEEN period_start AND period_end
      ORDER BY period_start DESC LIMIT 1;
    IF _tgt IS NOT NULL THEN
      UPDATE public.broker_achievements
        SET achieved_amount = GREATEST(0, achieved_amount - COALESCE(OLD.gross_premium, OLD.net_premium, 0)),
            last_updated = now()
      WHERE target_id = _tgt;
    END IF;
  END IF;

  -- Apply new contribution
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.broker_id IS NOT NULL THEN
    _delta := COALESCE(NEW.gross_premium, NEW.net_premium, 0);
    SELECT id INTO _tgt FROM public.broker_targets
      WHERE broker_id = NEW.broker_id
        AND NEW.txn_date BETWEEN period_start AND period_end
      ORDER BY period_start DESC LIMIT 1;
    IF _tgt IS NOT NULL THEN
      INSERT INTO public.broker_achievements (company_id, broker_id, target_id, achieved_amount)
      VALUES (NEW.company_id, NEW.broker_id, _tgt, _delta)
      ON CONFLICT (target_id) DO UPDATE
        SET achieved_amount = public.broker_achievements.achieved_amount + EXCLUDED.achieved_amount,
            last_updated = now();
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_update_broker_achievement ON public.policy_transactions;
CREATE TRIGGER trg_update_broker_achievement
AFTER INSERT OR UPDATE OR DELETE ON public.policy_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_broker_achievement_from_txn();
