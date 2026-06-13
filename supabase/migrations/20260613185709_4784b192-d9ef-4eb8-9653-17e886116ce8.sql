
-- RLS for customer-docs bucket; files are stored under <company_id>/<customer_id>/<filename>
CREATE POLICY "customer_docs_select_company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_company_id()::text
  )
);

CREATE POLICY "customer_docs_insert_company"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-docs'
  AND (storage.foldername(name))[1] = public.user_company_id()::text
);

CREATE POLICY "customer_docs_delete_company"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND (
    public.is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_company_id()::text
  )
);

CREATE POLICY "customer_docs_update_company"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'customer-docs'
  AND (storage.foldername(name))[1] = public.user_company_id()::text
);
