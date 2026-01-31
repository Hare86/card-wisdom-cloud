-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks for RAG (parsed from PDFs)
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chunks"
ON public.document_chunks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chunks"
ON public.document_chunks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks"
ON public.document_chunks FOR DELETE
USING (auth.uid() = user_id);

-- Create index for vector similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Semantic cache for AI queries
CREATE TABLE public.query_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  response TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX query_cache_hash_idx ON public.query_cache(query_hash);
CREATE INDEX query_cache_embedding_idx ON public.query_cache 
USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 50);

-- Token usage tracking for ROI analysis
CREATE TABLE public.token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  query_type TEXT DEFAULT 'chat',
  cache_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
ON public.token_usage FOR SELECT
USING (auth.uid() = user_id);

-- AI response evaluations (RAGAS-style metrics)
CREATE TABLE public.ai_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context_used TEXT[],
  faithfulness_score DECIMAL(3,2),
  relevance_score DECIMAL(3,2),
  user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5),
  model_used TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own evaluations"
ON public.ai_evaluations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluations"
ON public.ai_evaluations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User alerts for expiring points, milestones, etc.
CREATE TABLE public.user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_points', 'milestone', 'new_partner', 'promo', 'security')),
  title TEXT NOT NULL,
  description TEXT,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
ON public.user_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.user_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.user_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Parsed transactions from statements
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.pdf_documents(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT,
  points_earned INTEGER DEFAULT 0,
  merchant_name TEXT,
  is_masked BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Compliance audit log
CREATE TABLE public.compliance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  pii_accessed BOOLEAN DEFAULT false,
  pii_masked BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PII masking audit (tracks what was masked)
CREATE TABLE public.pii_masking_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  pii_types_found TEXT[],
  fields_masked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Card benefits knowledge base (for RAG)
CREATE TABLE public.card_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  card_name TEXT NOT NULL,
  benefit_category TEXT NOT NULL,
  benefit_title TEXT NOT NULL,
  benefit_description TEXT NOT NULL,
  conditions TEXT,
  value_estimate DECIMAL(10,2),
  embedding vector(1536),
  is_active BOOLEAN DEFAULT true,
  source_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX card_benefits_embedding_idx ON public.card_benefits 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Function to find similar cached queries
CREATE OR REPLACE FUNCTION public.find_similar_cache(
  query_emb vector(1536),
  similarity_threshold FLOAT DEFAULT 0.92,
  max_results INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  query_text TEXT,
  response TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id,
    qc.query_text,
    qc.response,
    1 - (qc.query_embedding <=> query_emb) as similarity
  FROM public.query_cache qc
  WHERE qc.expires_at > now()
    AND 1 - (qc.query_embedding <=> query_emb) > similarity_threshold
  ORDER BY qc.query_embedding <=> query_emb
  LIMIT max_results;
END;
$$;

-- Function to search document chunks by similarity
CREATE OR REPLACE FUNCTION public.search_documents(
  user_uuid UUID,
  query_emb vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.chunk_text,
    dc.metadata,
    1 - (dc.embedding <=> query_emb) as similarity
  FROM public.document_chunks dc
  WHERE dc.user_id = user_uuid
  ORDER BY dc.embedding <=> query_emb
  LIMIT match_count;
END;
$$;

-- Function to search card benefits
CREATE OR REPLACE FUNCTION public.search_benefits(
  query_emb vector(1536),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  bank_name TEXT,
  card_name TEXT,
  benefit_title TEXT,
  benefit_description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.id,
    cb.bank_name,
    cb.card_name,
    cb.benefit_title,
    cb.benefit_description,
    1 - (cb.embedding <=> query_emb) as similarity
  FROM public.card_benefits cb
  WHERE cb.is_active = true
  ORDER BY cb.embedding <=> query_emb
  LIMIT match_count;
END;
$$;