-- Template patterns table for adaptive extraction (NO PII stored)
CREATE TABLE public.statement_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  template_hash TEXT NOT NULL UNIQUE,
  template_version INTEGER NOT NULL DEFAULT 1,
  field_patterns JSONB NOT NULL DEFAULT '{}',
  header_patterns JSONB NOT NULL DEFAULT '{}',
  table_patterns JSONB NOT NULL DEFAULT '{}',
  confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
  extraction_success_count INTEGER NOT NULL DEFAULT 0,
  extraction_failure_count INTEGER NOT NULL DEFAULT 0,
  last_successful_extraction TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast template lookup
CREATE INDEX idx_statement_templates_bank ON public.statement_templates(bank_name);
CREATE INDEX idx_statement_templates_hash ON public.statement_templates(template_hash);

-- Enhanced extraction audit log (compliance requirement)
CREATE TABLE public.extraction_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.pdf_documents(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.statement_templates(id) ON DELETE SET NULL,
  extraction_method TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  fields_extracted INTEGER NOT NULL DEFAULT 0,
  pii_fields_masked INTEGER NOT NULL DEFAULT 0,
  processing_time_ms INTEGER,
  llm_model_used TEXT,
  llm_tokens_input INTEGER,
  llm_tokens_output INTEGER,
  password_protected BOOLEAN NOT NULL DEFAULT false,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for audit queries
CREATE INDEX idx_extraction_audit_user ON public.extraction_audit_log(user_id, created_at DESC);
CREATE INDEX idx_extraction_audit_status ON public.extraction_audit_log(extraction_status);

-- Enable RLS
ALTER TABLE public.statement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_audit_log ENABLE ROW LEVEL SECURITY;

-- Templates are read-only for all authenticated users (system-managed)
CREATE POLICY "Templates are viewable by authenticated users"
ON public.statement_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Audit logs: users can only view their own
CREATE POLICY "Users can view their own audit logs"
ON public.extraction_audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert audit logs (via service role in edge function)
CREATE POLICY "System can insert audit logs"
ON public.extraction_audit_log
FOR INSERT
WITH CHECK (true);

-- Trigger for template updated_at
CREATE TRIGGER update_statement_templates_updated_at
BEFORE UPDATE ON public.statement_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for compliance documentation
COMMENT ON TABLE public.statement_templates IS 'Stores structural patterns for bank statement templates. NO PII - only layout metadata for adaptive extraction.';
COMMENT ON TABLE public.extraction_audit_log IS 'GDPR/PCI-DSS compliant audit trail for all document extractions. Tracks PII masking compliance.';
COMMENT ON COLUMN public.extraction_audit_log.pii_fields_masked IS 'Count of PII fields that were masked before LLM processing - compliance metric.';