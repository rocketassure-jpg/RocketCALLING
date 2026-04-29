import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const { lead_id, notes, customer_name, status } = await req.json();
    if (!notes && !customer_name) return new Response(JSON.stringify({ error: "notes or customer_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let suggestion = "";
    let model = "claude-3-5-sonnet-20241022";

    const prompt = `You are an insurance CRM assistant for Rocket Services. Customer: ${customer_name || "—"}. Status: ${status || "—"}. Agent notes:\n${notes || "(no notes)"}\n\nGive 3 concise next-step recommendations for the agent in Hinglish, as a numbered list. Be practical and brief.`;

    if (claudeKey) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: `Claude error: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await r.json();
      suggestion = data.content?.[0]?.text || "";
    } else if (lovableKey) {
      // Fallback to Lovable AI
      model = "google/gemini-3-flash-preview";
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) {
        if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await r.json();
      suggestion = data.choices?.[0]?.message?.content || "";
    } else {
      return new Response(JSON.stringify({ error: "No AI key configured (ANTHROPIC_API_KEY or LOVABLE_API_KEY)" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (lead_id && suggestion) {
      await supabase.from("ai_suggestions").insert({ lead_id, suggestion, model, created_by: userId });
    }
    return new Response(JSON.stringify({ suggestion, model }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
