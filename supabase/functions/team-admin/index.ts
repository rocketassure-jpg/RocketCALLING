import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

export const defaultPasswordFor = (name: string, mobile: string) => {
  const letters = (name || "").replace(/[^A-Za-z]/g, "");
  const head = (letters.slice(0, 4) || "user").padEnd(4, "x");
  const cap = head.charAt(0).toUpperCase() + head.slice(1).toLowerCase();
  const digits = (mobile || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `${cap}${digits}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // caller must be admin or super_admin
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      admin.from("profiles").select("company_id,is_super_admin").eq("id", callerId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle(),
    ]);
    const isAdmin = !!roleRow || !!prof?.is_super_admin;
    if (!isAdmin) return json({ error: "Admin only" }, 403);
    const companyId = prof?.company_id ?? null;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "add_member") {
      const fullName = String(body.full_name || "").trim();
      const mobile = String(body.mobile || "").replace(/\D/g, "");
      const role = (["manager", "telecaller", "sub_agent"].includes(body.role) ? body.role : "telecaller") as
        | "manager" | "telecaller" | "sub_agent";
      const designation = body.designation ? String(body.designation) : null;
      const branchId = body.branch_id ? String(body.branch_id) : null;
      let email = String(body.email || "").trim().toLowerCase();

      if (!fullName) return json({ error: "Name required" }, 400);
      if (mobile.length < 10) return json({ error: "Valid 10-digit mobile required" }, 400);

      const password = defaultPasswordFor(fullName, mobile);

      if (!email) {
        // synthesize staff email using company code if available
        const { data: comp } = await admin.from("companies").select("code").eq("id", companyId).maybeSingle();
        const slug = (comp?.code || "staff").toLowerCase().replace(/[^a-z0-9]/g, "");
        email = `${mobile}@${slug}.staff.local`;
      }

      const { data: created, error: cuErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, mobile, requested_role: role },
      });
      if (cuErr || !created.user) return json({ error: cuErr?.message || "Create failed" }, 400);

      const uid = created.user.id;
      // ensure profile in this company (trigger creates one with possibly wrong company)
      await admin.from("profiles").update({
        full_name: fullName,
        mobile,
        company_id: companyId,
        branch_id: branchId,
        designation,
        is_active: true,
        is_approved: true,
        requested_role: role,
      } as any).eq("id", uid);

      // role row
      await admin.from("user_roles").delete().eq("user_id", uid);
      await admin.from("user_roles").insert({ user_id: uid, role } as any);

      return json({ ok: true, user_id: uid, email, password });
    }

    if (action === "reset_to_default") {
      const targetId = String(body.user_id || "");
      if (!targetId) return json({ error: "user_id required" }, 400);
      const { data: tp } = await admin.from("profiles").select("full_name,mobile,company_id").eq("id", targetId).maybeSingle();
      if (!tp) return json({ error: "User not found" }, 404);
      if (!prof?.is_super_admin && tp.company_id !== companyId) return json({ error: "Cross-company" }, 403);
      const password = defaultPasswordFor(tp.full_name || "", tp.mobile || "");
      const { error: uErr } = await admin.auth.admin.updateUserById(targetId, { password });
      if (uErr) return json({ error: uErr.message }, 400);
      return json({ ok: true, password });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
