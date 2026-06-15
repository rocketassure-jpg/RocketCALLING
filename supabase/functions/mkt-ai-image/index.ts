// Marketing Engine: AI poster image generator (Lovable AI image model)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { prompt, brand = "Rocketdial", phone = "", offer = "" } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "image_failed", status: r.status, body: text }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    return new Response(JSON.stringify({ image_url: imageUrl, raw: imageUrl ? undefined : data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
