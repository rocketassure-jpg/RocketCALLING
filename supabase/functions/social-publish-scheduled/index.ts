// 5-min cron — publishes scheduled social posts (FB / IG / LinkedIn) via Graph API
import { adminClient, corsHeaders } from "../_shared/marketing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = cronSecret.length > 0 && providedSecret === cronSecret;
  const isService = authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (!isCron && !isService) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = adminClient();
    const nowIso = new Date().toISOString();
    const { data: posts } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .limit(50);

    const summary: any[] = [];
    for (const post of posts ?? []) {
      let okCount = 0; let errCount = 0;
      for (const platform of post.platforms ?? []) {
        const { data: integration } = await supabase
          .from("marketing_integrations")
          .select("*")
          .eq("company_id", post.company_id)
          .eq("platform", platform)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (!integration) {
          await supabase.from("social_post_logs").insert({
            post_id: post.id, company_id: post.company_id, platform,
            status: "error", response: { error: "No active integration" },
          });
          errCount++;
          continue;
        }

        try {
          const endpoint = platform === "linkedin"
            ? `https://api.linkedin.com/v2/ugcPosts`
            : `https://graph.facebook.com/v19.0/${integration.page_id}/${post.media_url ? "photos" : "feed"}`;

          const body = platform === "linkedin"
            ? JSON.stringify({
                author: `urn:li:person:${integration.page_id}`,
                lifecycleState: "PUBLISHED",
                specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: post.content }, shareMediaCategory: "NONE" } },
                visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
              })
            : new URLSearchParams({
                message: post.content,
                ...(post.media_url ? { url: post.media_url } : {}),
                access_token: integration.access_token,
              }).toString();

          const res = await fetch(endpoint, {
            method: "POST",
            headers: platform === "linkedin"
              ? { Authorization: `Bearer ${integration.access_token}`, "Content-Type": "application/json" }
              : { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          const responseJson = await res.json().catch(() => ({ status: res.status }));
          await supabase.from("social_post_logs").insert({
            post_id: post.id, company_id: post.company_id, platform,
            status: res.ok ? "success" : "error", response: responseJson,
          });
          res.ok ? okCount++ : errCount++;
        } catch (e) {
          await supabase.from("social_post_logs").insert({
            post_id: post.id, company_id: post.company_id, platform,
            status: "error", response: { error: (e as Error).message },
          });
          errCount++;
        }
      }

      const newStatus = errCount === 0 ? "posted" : okCount === 0 ? "failed" : "partial";
      await supabase.from("scheduled_posts").update({ status: newStatus }).eq("id", post.id);
      summary.push({ post_id: post.id, ok: okCount, err: errCount, status: newStatus });
    }

    return new Response(JSON.stringify({ ok: true, processed: posts?.length ?? 0, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
