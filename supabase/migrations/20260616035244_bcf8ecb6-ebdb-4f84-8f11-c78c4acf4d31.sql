
-- Fix 1: external_api_registry — restrict SELECT to admins/super_admins
DROP POLICY IF EXISTS "External API registry select" ON public.external_api_registry;
DROP POLICY IF EXISTS "Admins read external_api_registry" ON public.external_api_registry;
CREATE POLICY "Admins read external_api_registry"
ON public.external_api_registry
FOR SELECT
TO authenticated
USING (
  company_id = public.user_company_id()
  AND (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
);

-- Fix 2: app_settings — enforce column-level REVOKE on invite_code so even with row access,
-- the secret column cannot be selected directly. Use get_invite_code() RPC for admins.
REVOKE SELECT (invite_code) ON public.app_settings FROM anon, authenticated;

-- Fix 3 & 4: marketing_integrations & whatsapp_bridge_settings — revoke column-level SELECT
-- on plaintext secret columns from authenticated. Service role (edge functions) retains access.
REVOKE SELECT (access_token, wa_api_key, wa_webhook_secret, sms_api_key, voice_api_key)
  ON public.marketing_integrations FROM anon, authenticated;

REVOKE SELECT (bridge_api_key) ON public.whatsapp_bridge_settings FROM anon, authenticated;
