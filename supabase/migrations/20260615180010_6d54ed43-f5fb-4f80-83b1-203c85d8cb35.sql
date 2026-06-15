
DO $$
DECLARE
  _cid uuid;
  _admin uuid := '4e250cd8-6cbc-4530-8f18-ccc9953349b6'::uuid;
  _b1 uuid; _b2 uuid;
  _a1 uuid; _a2 uuid; _a3 uuid;
  _ins1 uuid; _ins2 uuid;
  _br1 uuid;
  _ag1 uuid; _ag2 uuid;
  _c1 uuid; _c2 uuid; _c3 uuid;
  _l1 uuid;
BEGIN
  SELECT id INTO _cid FROM public.companies WHERE code='WINGSDEMO';
  IF _cid IS NULL THEN
    INSERT INTO public.companies (name, code, owner_name, contact_phone, contact_email, address, pincode, gst_number, tagline)
    VALUES ('Wings Demo Insurance','WINGSDEMO','Demo Owner','9876543210','demo@wingsdemo.in','42 Demo Street, Mumbai','400001','27AAAPL1234C1Z5','Demo data for end-to-end testing')
    RETURNING id INTO _cid;
  END IF;

  INSERT INTO public.company_subscriptions (company_id, module_key, billing_cycle, status, end_date)
  SELECT _cid, module_key, 'lifetime','active', NULL FROM public.modules
  ON CONFLICT DO NOTHING;

  INSERT INTO public.app_settings (company_id) VALUES (_cid) ON CONFLICT DO NOTHING;

  SELECT id INTO _b1 FROM public.branches WHERE company_id=_cid AND code='MUM';
  IF _b1 IS NULL THEN
    INSERT INTO public.branches (company_id, name, code, city, state, pincode, phone, is_active, created_by)
    VALUES (_cid,'Mumbai HQ','MUM','Mumbai','MH','400001','02212345678',true,_admin) RETURNING id INTO _b1;
  END IF;
  SELECT id INTO _b2 FROM public.branches WHERE company_id=_cid AND code='PUN';
  IF _b2 IS NULL THEN
    INSERT INTO public.branches (company_id, name, code, city, state, pincode, phone, is_active, created_by)
    VALUES (_cid,'Pune Branch','PUN','Pune','MH','411001','02012345678',true,_admin) RETURNING id INTO _b2;
  END IF;

  SELECT id INTO _a1 FROM public.areas WHERE name='WingsDemo Andheri';
  IF _a1 IS NULL THEN INSERT INTO public.areas (company_id,name) VALUES (_cid,'WingsDemo Andheri') RETURNING id INTO _a1; END IF;
  SELECT id INTO _a2 FROM public.areas WHERE name='WingsDemo Bandra';
  IF _a2 IS NULL THEN INSERT INTO public.areas (company_id,name) VALUES (_cid,'WingsDemo Bandra') RETURNING id INTO _a2; END IF;
  SELECT id INTO _a3 FROM public.areas WHERE name='WingsDemo Kothrud';
  IF _a3 IS NULL THEN INSERT INTO public.areas (company_id,name) VALUES (_cid,'WingsDemo Kothrud') RETURNING id INTO _a3; END IF;

  SELECT id INTO _ins1 FROM public.insurers WHERE company_id=_cid AND short_code='HDFCERGO';
  IF _ins1 IS NULL THEN INSERT INTO public.insurers (company_id,name,short_code,category) VALUES (_cid,'HDFC Ergo','HDFCERGO','motor') RETURNING id INTO _ins1; END IF;
  SELECT id INTO _ins2 FROM public.insurers WHERE company_id=_cid AND short_code='STARH';
  IF _ins2 IS NULL THEN INSERT INTO public.insurers (company_id,name,short_code,category) VALUES (_cid,'Star Health','STARH','health') RETURNING id INTO _ins2; END IF;
  INSERT INTO public.insurers (company_id,name,short_code,category)
    SELECT _cid,'LIC','LIC','life' WHERE NOT EXISTS (SELECT 1 FROM public.insurers WHERE company_id=_cid AND short_code='LIC');

  SELECT id INTO _br1 FROM public.brokers WHERE company_id=_cid LIMIT 1;
  IF _br1 IS NULL THEN
    INSERT INTO public.brokers (company_id,name,contact_person,mobile,email,status,created_by)
    VALUES (_cid,'WingsDemo POSP Hub','Rakesh Sharma','9988776655','posp@wingsdemo.in','active',_admin) RETURNING id INTO _br1;
  END IF;

  SELECT id INTO _ag1 FROM public.agents_profile WHERE company_id=_cid AND agent_code='WD-AG-001';
  IF _ag1 IS NULL THEN
    INSERT INTO public.agents_profile (company_id,full_name,agent_code,agent_type,phone,email,pan,split_percent,is_active)
    VALUES (_cid,'Demo Agent One','WD-AG-001','direct','9001112221','agent1@wingsdemo.in','ABCDE1234F',70,true) RETURNING id INTO _ag1;
  END IF;
  SELECT id INTO _ag2 FROM public.agents_profile WHERE company_id=_cid AND agent_code='WD-AG-002';
  IF _ag2 IS NULL THEN
    INSERT INTO public.agents_profile (company_id,full_name,agent_code,agent_type,phone,email,pan,split_percent,is_active)
    VALUES (_cid,'Demo Agent Two','WD-AG-002','posp','9001112222','agent2@wingsdemo.in','ABCDE5678G',60,true) RETURNING id INTO _ag2;
  END IF;

  INSERT INTO public.customers (company_id,branch_id,full_name,mobile,email,city,state,pincode,kyc_status,created_by)
  VALUES (_cid,_b1,'Amit Kumar','9810000001','amit@example.com','Mumbai','MH','400053','verified',_admin)
  ON CONFLICT (company_id, mobile) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id INTO _c1;
  INSERT INTO public.customers (company_id,branch_id,full_name,mobile,email,city,state,pincode,kyc_status,created_by)
  VALUES (_cid,_b1,'Priya Singh','9810000002','priya@example.com','Mumbai','MH','400050','verified',_admin)
  ON CONFLICT (company_id, mobile) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id INTO _c2;
  INSERT INTO public.customers (company_id,branch_id,full_name,mobile,email,city,state,pincode,kyc_status,created_by)
  VALUES (_cid,_b2,'Rohit Patil','9810000003','rohit@example.com','Pune','MH','411038','pending',_admin)
  ON CONFLICT (company_id, mobile) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id INTO _c3;

  IF NOT EXISTS (SELECT 1 FROM public.leads WHERE company_id=_cid AND phone_number='9810000001') THEN
    INSERT INTO public.leads (customer_name,phone_number,area_id,policy_type,status,premium_amount,city_village,company_id,customer_id,policy_expiry_date)
    VALUES ('Amit Kumar','9810000001',_a1,'Motor','Interested',12500,'Mumbai',_cid,_c1, CURRENT_DATE + 25) RETURNING id INTO _l1;
  ELSE
    SELECT id INTO _l1 FROM public.leads WHERE company_id=_cid AND phone_number='9810000001' LIMIT 1;
  END IF;
  INSERT INTO public.leads (customer_name,phone_number,area_id,policy_type,status,premium_amount,city_village,company_id,customer_id)
    SELECT 'Priya Singh','9810000002',_a2,'Health','New',18000,'Mumbai',_cid,_c2
    WHERE NOT EXISTS (SELECT 1 FROM public.leads WHERE company_id=_cid AND phone_number='9810000002');
  INSERT INTO public.leads (customer_name,phone_number,area_id,policy_type,status,premium_amount,city_village,company_id,customer_id)
    SELECT 'Rohit Patil','9810000003',_a3,'Life','Follow-up',24000,'Pune',_cid,_c3
    WHERE NOT EXISTS (SELECT 1 FROM public.leads WHERE company_id=_cid AND phone_number='9810000003');

  INSERT INTO public.policy_transactions (company_id,txn_date,policy_no,insurer_id,agent_id,broker_id,lead_id,client_name,client_phone,policy_type,od_premium,tp_premium,commission_rate,commission_amount,status,created_by)
  VALUES (_cid, CURRENT_DATE-10, 'WD-POL-0001', _ins1, _ag1, _br1, _l1, 'Amit Kumar','9810000001','Motor', 8000, 4500, 12.5, 1562.50, 'received', _admin)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.policy_transactions (company_id,txn_date,policy_no,insurer_id,agent_id,client_name,client_phone,policy_type,net_premium,commission_rate,commission_amount,status,created_by)
  VALUES (_cid, CURRENT_DATE-5,  'WD-POL-0002', _ins2, _ag2, 'Priya Singh','9810000002','Health', 18000, 15, 2700, 'expected', _admin)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.agent_payouts (company_id,agent_id,period_month,period_year,total_business,total_commission,tds_deducted,net_payable,status)
  VALUES (_cid,_ag1, EXTRACT(MONTH FROM CURRENT_DATE)::int, EXTRACT(YEAR FROM CURRENT_DATE)::int, 12500, 1562.50, 78.13, 1484.37, 'pending')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.renewals (company_id,customer_id,customer_name,phone_number,policy_type,policy_number,expiry_date,premium_amount,status)
    SELECT _cid,_c1,'Amit Kumar','9810000001','Motor','WD-POL-0001', CURRENT_DATE + 25, 12500,'pending'
    WHERE NOT EXISTS (SELECT 1 FROM public.renewals WHERE company_id=_cid AND policy_number='WD-POL-0001');

  RAISE NOTICE 'WINGSDEMO seeded id=%', _cid;
END $$;
