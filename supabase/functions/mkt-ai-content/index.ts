// Marketing Engine: AI content generator (Lovable AI Gateway)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const userId = claimsData.claims.sub as string;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "manager"]).maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin/manager required" }), { status: 403, headers: jsonHeaders });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: jsonHeaders });
    }
    const { topic, language = "hinglish", phone = "", channels = ["facebook","instagram","whatsapp"] } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: jsonHeaders });
    }

    const system = `You are a senior insurance marketing copywriter for an Indian insurance CRM (Rocketdial).
Write punchy social media posts in ${language === "hinglish" ? "Hinglish (Roman Hindi mixed with English)" : language}.
Use emojis, short lines, bullets with ✓. Always include a clear CTA with phone ${phone || "{phone}"}.
Return STRICT JSON only.`;

    const user = `Topic: ${topic}
Channels: ${channels.join(", ")}
Return JSON:
{
  "variants": [ { "title": "...", "body": "..." }, ... 5 items ],
  "hashtags": ["#tag1", ...],
  "best_time": "e.g. Mon 10:00 AM",
  "image_prompt": "1 short prompt to generate a matching square poster"
}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: "ai_failed", status: r.status, body: text }), { status: r.status, headers: jsonHeaders });
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { variants: [{ title: "AI", body: content }] }; }
    return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders });
  }
});
