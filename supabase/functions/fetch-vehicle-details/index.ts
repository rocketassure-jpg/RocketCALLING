// Vehicle lookup: cache first, then PolicyBoss/VAHAN fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { registration_number } = await req.json();
    if (!registration_number) return json({ error: "registration_number required" }, 400);
    const reg = String(registration_number).toUpperCase().replace(/\s+/g, "");

    // 1) local cache
    const { data: cached } = await supabase
      .from("vehicles").select("*")
      .ilike("registration_number", reg).maybeSingle();
    if (cached) {
      return json({ source: "cache", vehicle: normalize(cached, reg) });
    }

    // 2) try PolicyBoss vehicle lookup
    const { data: integ } = await supabase
      .from("super_admin_integrations").select("credentials")
      .eq("integration_key", "policyboss_posp").maybeSingle();
    const token = integ?.credentials?.token;

    let fetched: any = null;
    if (token && !String(token).startsWith("stub_")) {
      try {
        const r = await fetch(
          `https://partner.policyboss.com/api/vehicle/details?reg=${encodeURIComponent(reg)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (r.ok) fetched = await r.json();
      } catch { /* fall through */ }
    }

    if (!fetched) {
      // Stub data so UI flow works
      fetched = {
        make: "Maruti Suzuki", model: "Swift", variant: "VXI",
        mfg_year: new Date().getFullYear() - 3,
        fuel_type: "Petrol", rto_code: reg.slice(0, 4),
        owner_name: null, engine_cc: 1197, declared_value: 450000,
        _stub: true,
      };
    }

    return json({ source: "policyboss", vehicle: { registration_number: reg, ...fetched } });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function normalize(row: any, reg: string) {
  return {
    registration_number: reg,
    make: row.make, model: row.model, variant: row.variant,
    mfg_year: row.manufacture_year ?? row.mfg_year,
    fuel_type: row.fuel_type, rto_code: row.rto_code,
    owner_name: row.owner_name, engine_cc: row.engine_cc,
    declared_value: row.declared_value ?? 450000,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
