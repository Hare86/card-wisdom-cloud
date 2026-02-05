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
 * @param selectedCardId - If provided, filter transaction/card data to this card only
 */
export async function retrieveContext(
  supabase: SupabaseClient,
  query: string,
  userId: string,
  apiKey: string,
  selectedCardId?: string
): Promise<RetrievedContext> {
  const result: RetrievedContext = {
    documentChunks: [],
    benefitsContext: [],
    transactionSummary: null,
    userCards: null,
  };

  try {
    // Generate embedding for the query
    const { embedding } = await generateEmbedding(query, apiKey);
    const vectorString = embeddingToVector(embedding);

    // Check if embeddings are available
    if (vectorString) {
      // Run semantic search in parallel for efficiency
      const [docResults, benefitsResults, transactionResults, userCardsData] = await Promise.all([
        // Semantic search on user's document chunks
        searchDocuments(supabase, vectorString, userId),
        // Semantic search on card benefits knowledge base
        searchBenefits(supabase, vectorString),
        // Get aggregated transaction data (filtered by card if selected)
        getTransactionSummary(supabase, userId, selectedCardId),
        // Get user's credit cards (filtered if card selected)
        getUserCards(supabase, userId, selectedCardId),
      ]);

      result.documentChunks = docResults;
      result.benefitsContext = benefitsResults;
      result.transactionSummary = transactionResults;
      result.userCards = userCardsData;

      console.log(`Retrieved context: ${docResults.length} docs, ${benefitsResults.length} benefits, cards: ${userCardsData ? 'yes' : 'no'}`);
    } else {
      // Embeddings not available, use fallback retrieval
      console.log("Embeddings not available, using text-based retrieval");
      return await fallbackRetrieval(supabase, userId, selectedCardId);
    }
  } catch (error) {
    console.error("Context retrieval error:", error);
    // Fall back to non-semantic retrieval
    return await fallbackRetrieval(supabase, userId, selectedCardId);
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
 * @param selectedCardId - If provided, only include transactions for this card
 */
async function getTransactionSummary(
  supabase: SupabaseClient,
  userId: string,
  selectedCardId?: string
): Promise<string | null> {
  let query = supabase
    .from("transactions")
    .select("category, amount, points_earned, card_id")
    .eq("user_id", userId)
    .limit(200);
  
  // Filter by selected card if provided
  if (selectedCardId) {
    query = query.eq("card_id", selectedCardId);
  }

  const { data: transactions, error } = await query;

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

  const prefix = selectedCardId ? "Selected card" : "User";
  return `${prefix} spending summary by category: ${JSON.stringify(summary)}`;
}

/**
 * Get user's credit cards with points balances
 * @param selectedCardId - If provided, only return this specific card
 */
async function getUserCards(
  supabase: SupabaseClient,
  userId: string,
  selectedCardId?: string
): Promise<string | null> {
  let query = supabase
    .from("credit_cards")
    .select("id, bank_name, card_name, points, point_value, last_four")
    .eq("user_id", userId);
  
  // Filter to specific card if selected
  if (selectedCardId) {
    query = query.eq("id", selectedCardId);
  }

  const { data: cards, error } = await query;

  if (error || !cards || cards.length === 0) {
    return null;
  }

  const cardsSummary = cards.map((c) => {
    const pointValue = c.point_value || 0.25; // Default INR per point
    const estimatedValue = ((c.points || 0) * pointValue).toFixed(0);
    return `${c.bank_name} ${c.card_name}${c.last_four ? ` (****${c.last_four})` : ''}: ${(c.points || 0).toLocaleString()} points (~₹${estimatedValue} value)`;
  }).join("\n");

  const totalPoints = cards.reduce((sum, c) => sum + (c.points || 0), 0);
  const totalValue = cards.reduce((sum, c) => sum + ((c.points || 0) * (c.point_value || 0.25)), 0);

  const header = selectedCardId 
    ? `Selected Card Details` 
    : `User's Credit Cards (${cards.length} cards, ${totalPoints.toLocaleString()} total points, ~₹${totalValue.toFixed(0)} total value)`;

  return `${header}:\n${cardsSummary}`;
}

/**
 * Fallback to simple text retrieval if semantic search fails
 * IMPORTANT: This must retrieve ALL context sources, not just documents
 */
async function fallbackRetrieval(
  supabase: SupabaseClient,
  userId: string,
  selectedCardId?: string
): Promise<RetrievedContext> {
  console.log("Using fallback non-semantic retrieval with full context");

  const [docsResult, benefitsResult, transactionSummary, userCards] = await Promise.all([
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
    // Include transaction summary in fallback (filtered by card if selected)
    getTransactionSummary(supabase, userId, selectedCardId),
    // Include user cards in fallback (filtered by card if selected)
    getUserCards(supabase, userId, selectedCardId),
  ]);

  return {
    documentChunks: (docsResult.data || []).map((d) => d.chunk_text),
    benefitsContext: (benefitsResult.data || []).map(
      (b) => `${b.bank_name} ${b.card_name}: ${b.benefit_title} - ${b.benefit_description}`
    ),
    transactionSummary,
    userCards,
  };
}

/**
 * Build context section for the LLM prompt
 */
export function buildContextSection(context: RetrievedContext): string {
  const sections: string[] = [];

  // User's cards go first (most important for personalization)
  if (context.userCards) {
    sections.push("## Your Credit Cards\n" + context.userCards);
  }

  if (context.documentChunks.length > 0) {
    sections.push("## Your Statement Data\n" + context.documentChunks.join("\n\n"));
  }

  if (context.transactionSummary) {
    sections.push("## Spending Patterns\n" + context.transactionSummary);
  }

  if (context.benefitsContext.length > 0) {
    sections.push("## Card Benefits Knowledge Base\n" + context.benefitsContext.join("\n\n"));
  }

  if (sections.length === 0) {
    return "\n\nNOTE: No user data is available yet. The user may need to upload their credit card statements or add their cards to get personalized recommendations.";
  }

  return "\n\nRELEVANT CONTEXT (Use this data to answer the user's question):\n" + sections.join("\n\n---\n\n");
}
