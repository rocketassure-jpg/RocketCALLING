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
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { motor_quote_id } = await req.json();
    if (!motor_quote_id) return json({ error: "motor_quote_id required" }, 400);

    const { data: quote } = await supabase
      .from("motor_quotes").select("*").eq("id", motor_quote_id).maybeSingle();
    if (!quote) return json({ error: "Quote not found" }, 404);

    const { data: integ } = await supabase
      .from("super_admin_integrations").select("credentials")
      .eq("integration_key", "policyboss_posp").maybeSingle();
    const token = integ?.credentials?.token;

    let paymentUrl: string | null = null;
    let expiry = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    if (token && !String(token).startsWith("stub_") && quote.policyboss_quote_id) {
      try {
        const r = await fetch("https://partner.policyboss.com/api/payment/link", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            quote_id: quote.policyboss_quote_id,
            amount: quote.gross_premium ?? quote.net_premium,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          paymentUrl = j.payment_url ?? null;
          expiry = j.expiry ?? expiry;
        }
      } catch { /* stub below */ }
    }

    if (!paymentUrl) {
      // Stub link — replace with real gateway integration
      paymentUrl = `https://pay.policyboss.com/checkout/${motor_quote_id}`;
    }

    await supabase.from("motor_quotes").update({
      payment_link: paymentUrl,
      payment_sent_at: new Date().toISOString(),
      status: "payment_sent",
      current_step: 5,
    }).eq("id", motor_quote_id);

    if (quote.lead_id) {
      await supabase.from("leads").update({
        payment_link: paymentUrl, status: "Quote Sent",
      }).eq("id", quote.lead_id);
    }

    return json({ payment_url: paymentUrl, expiry });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
