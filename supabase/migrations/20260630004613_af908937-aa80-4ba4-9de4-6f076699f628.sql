CREATE OR REPLACE FUNCTION public.super_admin_delete_company(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _co record;
  _user_ids uuid[];
  _deleted_counts jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can delete companies';
  END IF;

  SELECT * INTO _co FROM public.companies WHERE id = _company_id;
  IF _co IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- collect user ids that belong to this company so we can clean user_roles
  SELECT COALESCE(array_agg(id), '{}') INTO _user_ids FROM public.profiles WHERE company_id = _company_id;

  -- log first (snapshot)
  INSERT INTO public.super_admin_audit_log (actor_id, action, target_type, target_id, old_data, new_data, reason)
  VALUES (auth.uid(), 'DELETE_COMPANY', 'company', _company_id::text, to_jsonb(_co), NULL,
          'Super admin cascade delete via super_admin_delete_company');

  -- Delete every table that has company_id, ordered so children are wiped first.
  -- Wrap each in EXCEPTION block: tables may not exist on every install.
  DECLARE
    _t text;
    _tables text[] := ARRAY[
      -- finest grain / dependents first
      'rto_status_history','rto_case_documents','rto_cases','rto_service_types',
      'claim_status_history','claim_notes','claim_followups','claim_expenses','claim_documents','claim_communications','claims',
      'customer_lifecycle_events','customer_tasks','customer_notes','customer_family_members','customer_contacts','customer_documents',
      'cross_sell_suggestions','customer_products','health_policy_members','health_policies','life_premium_schedule','life_nominees','life_policies',
      'motor_quotes','motor_policies','vehicles','puc_records','permits','fitness_certificates','rc_register','compliance_tracker','complaints',
      'renewals','renewal_campaigns','renewal_templates','admin_renewal_settings','audience_sync_logs','audience_sync_configs',
      'campaign_logs','mkt_scheduled_posts','mkt_campaign_metrics','mkt_campaigns','mkt_auto_triggers','mkt_lead_routing_rules',
      'mkt_audiences','mkt_templates','mkt_channels','mkt_festivals','marketing_templates','marketing_integrations','scheduled_posts','social_post_logs',
      'lead_quotes','lead_notes','call_logs','dial_logs','sms_logs','whatsapp_logs','wa_webhook_messages','webhook_events',
      'leads','enquiries','customers',
      'broker_achievements','broker_payouts','broker_slabs','broker_targets','broker_company_mapping','brokers',
      'agent_payouts','agents_profile','commission_rates','compensation_rules',
      'policy_transactions','premium_remittance','payment_records','expenses',
      'payout_agent_split_rules','payout_finance_rules','payout_insurance_rules','payout_rto_rules','payout_state_rules','payout_tax_rules','payout_vendor_rules',
      'vendor_commissions','vendor_documents','vendor_products','vendor_ratings','vendors','insurers','product_catalog',
      'tasks','service_requests','plan_templates','training_materials',
      'message_templates','whatsapp_bridge_settings','external_api_registry','api_keys',
      'announcements','ai_suggestions','export_history','audit_logs',
      'lead_statuses','status_mappings','crm_fields','employee_designations','role_permissions','feature_flags',
      'telecaller_areas','areas','break_logs',
      'company_subscriptions','app_settings','branches'
    ];
    _cnt bigint;
  BEGIN
    FOREACH _t IN ARRAY _tables LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE company_id = $1', _t) USING _company_id;
        GET DIAGNOSTICS _cnt = ROW_COUNT;
        IF _cnt > 0 THEN
          _deleted_counts := _deleted_counts || jsonb_build_object(_t, _cnt);
        END IF;
      EXCEPTION
        WHEN undefined_table THEN NULL;
        WHEN undefined_column THEN NULL;
      END;
    END LOOP;
  END;

  -- profiles + user_roles for users that belonged to this company
  IF array_length(_user_ids, 1) > 0 THEN
    DELETE FROM public.user_roles WHERE user_id = ANY(_user_ids);
    DELETE FROM public.profiles WHERE id = ANY(_user_ids);
    -- NOTE: we intentionally do NOT delete from auth.users (managed schema).
    -- Super admin can separately disable those accounts if needed.
  END IF;

  -- finally the company row
  DELETE FROM public.companies WHERE id = _company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'company_id', _company_id,
    'company_name', _co.name,
    'deleted', _deleted_counts,
    'profiles_removed', COALESCE(array_length(_user_ids,1),0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_delete_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_delete_company(uuid) TO authenticated;