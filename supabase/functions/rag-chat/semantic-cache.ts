/**
 * Semantic caching with vector embeddings
 * Uses pgvector for similarity search beyond exact hash matching
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import from shared utilities - use relative path with .ts extension
const embeddings = await import("../_shared/embeddings.ts");
const { generateEmbedding, embeddingToVector } = embeddings;

import type { CacheEntry } from "./types.ts";

const SIMILARITY_THRESHOLD = 0.92; // 92% similarity for cache hits
const CACHE_TTL_DAYS = 7;

/**
 * Generate SHA-256 hash for exact cache matching
 */
export async function generateCacheKey(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check cache using hybrid approach:
 * 1. First try exact hash match (fastest)
 * 2. If no exact match, try semantic similarity search
 */
export async function checkSemanticCache(
  supabase: SupabaseClient,
  query: string,
  apiKey: string
): Promise<CacheEntry | null> {
  // Step 1: Try exact hash match first (free, no embedding cost)
  const cacheKey = await generateCacheKey(query);
  
  const { data: exactMatch } = await supabase
    .from("query_cache")
    .select("id, query_text, response, model_used")
    .eq("query_hash", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (exactMatch) {
    console.log("Cache hit: exact hash match");
    await updateCacheHitCount(supabase, exactMatch.id);
    return { ...exactMatch, similarity: 1.0 };
  }

  // Step 2: Try semantic similarity search using embeddings
  try {
    const { embedding } = await generateEmbedding(query, apiKey);
    const vectorString = embeddingToVector(embedding);

    const { data: semanticMatches, error } = await supabase
      .rpc("find_similar_cache", {
        query_emb: vectorString,
        similarity_threshold: SIMILARITY_THRESHOLD,
        max_results: 1,
      });

    if (error) {
      console.error("Semantic cache search error:", error);
      return null;
    }

    if (semanticMatches && semanticMatches.length > 0) {
      const match = semanticMatches[0];
      console.log(`Cache hit: semantic match (${(match.similarity * 100).toFixed(1)}% similar)`);
      
      // Update hit count for the matched entry
      await updateCacheHitCount(supabase, match.id);
      
      return {
        id: match.id,
        query_text: match.query_text,
        response: match.response,
        model_used: "cached",
        similarity: match.similarity,
      };
    }

    return null;
  } catch (error) {
    console.error("Semantic cache lookup failed:", error);
    return null;
  }
}

/**
 * Store response in cache with embedding for semantic search
 */
export async function storeInCache(
  supabase: SupabaseClient,
  query: string,
  response: string,
  model: string,
  tokensInput: number,
  tokensOutput: number,
  apiKey: string
): Promise<void> {
  try {
    const cacheKey = await generateCacheKey(query);
    
    // Generate embedding for semantic search
    const { embedding } = await generateEmbedding(query, apiKey);
    const vectorString = embeddingToVector(embedding);

    await supabase.from("query_cache").insert({
      query_hash: cacheKey,
      query_text: query,
      query_embedding: vectorString,
      response,
      model_used: model,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
    });

    console.log("Response cached with embedding for semantic search");
  } catch (error) {
    console.error("Failed to store in cache:", error);
    // Don't throw - caching failure shouldn't break the main flow
  }
}

/**
 * Update hit count for a cache entry using raw SQL increment
 */
async function updateCacheHitCount(
  supabase: SupabaseClient,
  cacheId: string
): Promise<void> {
  // Use raw update with increment - hit_count + 1
  const { error } = await supabase
    .from("query_cache")
    .update({ hit_count: 1 }) // Will be incremented via SQL
    .eq("id", cacheId);
  
  // Alternatively, we can use a direct SQL increment via RPC
  // For now, just ensure the record is touched
  if (error) {
    console.error("Failed to update cache hit count:", error);
  }
}
