-- Add INSERT policy for compliance_logs table
-- Only authenticated users can insert their own compliance logs
CREATE POLICY "Authenticated users can insert their own compliance logs"
ON public.compliance_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);