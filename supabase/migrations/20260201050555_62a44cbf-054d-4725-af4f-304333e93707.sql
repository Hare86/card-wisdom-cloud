-- Fix: Replace overly permissive INSERT policy with proper service-role based insertion
-- The extraction_audit_log INSERT needs to verify the user_id matches the authenticated user
-- OR allow service role (which bypasses RLS anyway)

DROP POLICY IF EXISTS "System can insert audit logs" ON public.extraction_audit_log;

-- Only authenticated users can insert their own audit logs
-- Service role (used by edge functions) bypasses RLS entirely
CREATE POLICY "Users can insert their own audit logs"
ON public.extraction_audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);