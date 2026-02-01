/**
 * RAG retrieval module - semantic search across multiple sources
 * Uses vector embeddings for document and benefits search
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import from shared utilities - use dynamic import for Deno compatibility
const embeddings = await import("../_shared/embeddings.ts");
const { generateEmbedding, embeddingToVector } = embeddings;

import type { RetrievedContext } from "./types.ts";

const DEFAULT_MATCH_COUNT = 5;

/**
 * Retrieve relevant context using semantic search across all sources
 */
export async function retrieveContext(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  apiKey: string
): Promise<RetrievedContext> {
  const result: RetrievedContext = {
    documentChunks: [],
    benefitsContext: [],
    transactionSummary: null,
  };

  try {
    // Generate embedding for the query
    const { embedding } = await generateEmbedding(query, apiKey);
    const vectorString = embeddingToVector(embedding);

    // Run all retrievals in parallel for efficiency
    const [docResults, benefitsResults, transactionResults] = await Promise.all([
      // Semantic search on user's document chunks
      searchDocuments(supabase, vectorString, userId),
      // Semantic search on card benefits knowledge base
      searchBenefits(supabase, vectorString),
      // Get aggregated transaction data
      getTransactionSummary(supabase, userId),
    ]);

    result.documentChunks = docResults;
    result.benefitsContext = benefitsResults;
    result.transactionSummary = transactionResults;

    console.log(`Retrieved context: ${docResults.length} docs, ${benefitsResults.length} benefits`);
  } catch (error) {
    console.error("Context retrieval error:", error);
    // Fall back to non-semantic retrieval
    return await fallbackRetrieval(supabase, userId);
  }

  return result;
}

/**
 * Semantic search on user's document chunks
 */
async function searchDocuments(
  supabase: SupabaseClient,
  queryVector: string,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("search_documents", {
    query_emb: queryVector,
    user_uuid: userId,
    match_count: DEFAULT_MATCH_COUNT,
  });

  if (error) {
    console.error("Document search error:", error);
    return [];
  }

  return (data || []).map((d: { chunk_text: string; similarity: number }) => {
    const similarityPct = (d.similarity * 100).toFixed(0);
    return `[Relevance: ${similarityPct}%] ${d.chunk_text}`;
  });
}

/**
 * Semantic search on card benefits knowledge base
 */
async function searchBenefits(
  supabase: SupabaseClient,
  queryVector: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("search_benefits", {
    query_emb: queryVector,
    match_count: DEFAULT_MATCH_COUNT,
  });

  if (error) {
    console.error("Benefits search error:", error);
    return [];
  }

  return (data || []).map((b: {
    bank_name: string;
    card_name: string;
    benefit_title: string;
    benefit_description: string;
    similarity: number;
  }) => {
    const similarityPct = (b.similarity * 100).toFixed(0);
    return `[Match: ${similarityPct}%] ${b.bank_name} ${b.card_name}: ${b.benefit_title} - ${b.benefit_description}`;
  });
}

/**
 * Get aggregated transaction summary for the user
 */
async function getTransactionSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("category, amount, points_earned")
    .eq("user_id", userId)
    .limit(200);

  if (error || !transactions || transactions.length === 0) {
    return null;
  }

  const summary = transactions.reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = acc[cat] || { amount: 0, points: 0, count: 0 };
    acc[cat].amount += Math.abs(t.amount);
    acc[cat].points += t.points_earned || 0;
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; points: number; count: number }>);

  return `User spending summary by category: ${JSON.stringify(summary)}`;
}

/**
 * Fallback to simple text retrieval if semantic search fails
 */
async function fallbackRetrieval(
  supabase: SupabaseClient,
  userId: string
): Promise<RetrievedContext> {
  console.log("Using fallback non-semantic retrieval");

  const [docsResult, benefitsResult] = await Promise.all([
    supabase
      .from("document_chunks")
      .select("chunk_text")
      .eq("user_id", userId)
      .limit(10),
    supabase
      .from("card_benefits")
      .select("bank_name, card_name, benefit_title, benefit_description")
      .eq("is_active", true)
      .limit(10),
  ]);

  return {
    documentChunks: (docsResult.data || []).map((d) => d.chunk_text),
    benefitsContext: (benefitsResult.data || []).map(
      (b) => `${b.bank_name} ${b.card_name}: ${b.benefit_title} - ${b.benefit_description}`
    ),
    transactionSummary: null,
  };
}

/**
 * Build context section for the LLM prompt
 */
export function buildContextSection(context: RetrievedContext): string {
  const sections: string[] = [];

  if (context.documentChunks.length > 0) {
    sections.push("## Your Statement Data\n" + context.documentChunks.join("\n\n"));
  }

  if (context.benefitsContext.length > 0) {
    sections.push("## Card Benefits\n" + context.benefitsContext.join("\n\n"));
  }

  if (context.transactionSummary) {
    sections.push("## Spending Patterns\n" + context.transactionSummary);
  }

  if (sections.length === 0) {
    return "";
  }

  return "\n\nRELEVANT CONTEXT:\n" + sections.join("\n\n---\n\n");
}
