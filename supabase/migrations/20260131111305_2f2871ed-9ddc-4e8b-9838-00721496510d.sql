-- Fix RLS for query_cache (system table, restrict access)
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Query cache is managed by edge functions, no direct user access
CREATE POLICY "No direct access to query cache"
ON public.query_cache FOR ALL
USING (false);

-- Fix RLS for compliance_logs (admin/system only)
ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own compliance logs"
ON public.compliance_logs FOR SELECT
USING (auth.uid() = user_id);

-- Fix RLS for pii_masking_log (admin/system only)
ALTER TABLE public.pii_masking_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PII logs"
ON public.pii_masking_log FOR SELECT
USING (auth.uid() = user_id);

-- Fix RLS for card_benefits (public read, admin write)
ALTER TABLE public.card_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read card benefits"
ON public.card_benefits FOR SELECT
USING (is_active = true);

-- Add insert policy for token_usage (edge functions need to insert)
CREATE POLICY "System can insert token usage"
ON public.token_usage FOR INSERT
WITH CHECK (true);