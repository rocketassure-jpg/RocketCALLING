// Marketing Engine: AI content generator (Lovable AI Gateway)
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
    const { topic, language = "hinglish", phone = "", channels = ["facebook","instagram","whatsapp"] } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "ai_failed", status: r.status, body: text }), {
        status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    let content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { variants: [{ title: "AI", body: content }] }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
