/**
 * Shared embedding utilities for edge functions
 * Uses Lovable AI Gateway chat completions to generate pseudo-embeddings
 * 
 * Note: The Lovable AI Gateway doesn't support dedicated embedding models.
 * For semantic search, we use the existing pgvector infrastructure.
 * Benefits are stored without embeddings initially and can use text search.
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

/**
 * Generate text embedding placeholder
 * Note: Lovable AI Gateway only supports chat models, not embedding models.
 * For production semantic search, consider using an external embedding API.
 * Returns null to indicate embeddings are not available.
 */
export async function generateEmbedding(
  _text: string,
  _apiKey: string
): Promise<EmbeddingResult> {
  // Lovable AI Gateway doesn't support embedding models
  // Return empty result - benefits will work without embeddings using text search
  console.log("Note: Embeddings not available via Lovable AI Gateway. Using text search.");
  return {
    embedding: [],
    model: "none",
    tokens: 0,
  };
}

/**
 * Convert embedding array to PostgreSQL vector format
 */
export function embeddingToVector(embedding: number[]): string | null {
  if (!embedding || embedding.length === 0) {
    return null;
  }
  return `[${embedding.join(",")}]`;
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  
  for (const text of texts) {
    try {
      const result = await generateEmbedding(text, apiKey);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate embedding: ${error}`);
      results.push({
        embedding: [],
        model: "none",
        tokens: 0,
      });
    }
  }
  
  return results;
}
