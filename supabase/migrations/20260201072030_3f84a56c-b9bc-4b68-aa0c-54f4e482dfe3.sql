-- Add HNSW index on query_embedding for fast semantic cache lookups
-- Using cosine distance operator (<=>) for similarity search
-- m=16 controls connectivity, ef_construction=64 controls build quality
CREATE INDEX IF NOT EXISTS idx_query_cache_embedding_hnsw 
ON public.query_cache 
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add HNSW index on document_chunks for semantic document retrieval
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add HNSW index on card_benefits for semantic benefits search
CREATE INDEX IF NOT EXISTS idx_card_benefits_embedding_hnsw 
ON public.card_benefits 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add standard index on expires_at for cache expiry filtering
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at 
ON public.query_cache (expires_at);

-- Add composite index for faster exact hash lookups with expiry
CREATE INDEX IF NOT EXISTS idx_query_cache_hash_expires 
ON public.query_cache (query_hash, expires_at);