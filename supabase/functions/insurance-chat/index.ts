// Insurance AI assistant — streams answers via Lovable AI Gateway.
// Pulls admin-curated training notes so the bot stays on-brand and
// gradually collects customer info to suggest a plan/premium.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BASE_SYSTEM = `Tum "RocketBot" ho — ek friendly Insurance advisor (Hindi+English mix me baat karo, simple words).
Goal:
1. User ke insurance question simple language me samjhao (Motor, Health, Life, Term, Fire, Travel, etc).
2. Dheere-dheere bina pressure ke ye details nikalo (ek baar me sirf 1-2 question puchho):
   - Naam, Sheher, Age
   - Kis insurance ki zarurat (Car/Bike/Health/Life)
   - Vehicle: make/model/year/fuel  | Health: family size, age band  | Life: cover, term
   - Mobile number (last me politely)
3. Jab kaafi info mil jaye, ek approximate premium range ya plan suggestion do (disclaimer: final premium insurer pe depend karta hai).
4. Hamesha short, warm, emoji-light replies. Markdown bullets allowed.
5. Agar user kahe "agent se baat karni hai" → WhatsApp +91 96697 62808 share karo.
Never invent policy numbers, never ask Aadhaar/PAN/OTP/Card details.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'AI key missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { messages } = await req.json();
    if (!Array.isArray(messages)) return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Pull training notes (text/note bodies) for extra grounding
    let trainingContext = '';
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data } = await sb
        .from('training_materials')
        .select('title, description, body, content_type, module_key')
        .or('content_type.eq.note,category.eq.text')
        .limit(30);
      if (data?.length) {
        trainingContext = '\n\n=== Company training notes (use as ground truth) ===\n' +
          data.map((d: any) => `• ${d.title}${d.description ? ` — ${d.description}` : ''}${d.body ? `\n${d.body}` : ''}`).join('\n\n');
      }
    } catch (_) { /* non-fatal */ }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        stream: true,
        messages: [{ role: 'system', content: BASE_SYSTEM + trainingContext }, ...messages],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Rate limit, try again soon' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: t }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
