// Marketing Engine: AI poster image generator (Lovable AI image model)
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
    const { prompt, brand = "Rocketdial", phone = "", offer = "" } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: jsonHeaders });
    }

    const fullPrompt = `Bold modern Indian insurance marketing poster, square 1:1.
Theme: ${prompt}.
Style: deep navy/black background with neon red and orange accents matching brand "${brand}". Clean typography.
${offer ? `Big offer text: "${offer}".` : ""}
${phone ? `Footer phone number: ${phone}.` : ""}
No watermark. Vibrant, festive, eye-catching social media post.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: "image_failed", status: r.status, body: text }), { status: r.status, headers: jsonHeaders });
    }
    const data = await r.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    return new Response(JSON.stringify({ image_url: imageUrl, raw: imageUrl ? undefined : data }), { headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders });
  }
});
