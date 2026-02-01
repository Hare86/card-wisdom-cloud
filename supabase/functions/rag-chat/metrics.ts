/**
 * RAGAS-style evaluation metrics
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EvaluationMetrics {
  faithfulness: number;
  relevance: number;
}

/**
 * Calculate RAGAS-style metrics for response quality
 * In production, this would use a separate LLM call for evaluation
 */
export function calculateMetrics(
  query: string,
  response: string,
  context: string[]
): EvaluationMetrics {
  // Faithfulness: How much of the response is grounded in context
  const contextWords = new Set(context.join(" ").toLowerCase().split(/\s+/));
  const responseWords = response.toLowerCase().split(/\s+/);
  const groundedWords = responseWords.filter((w) => contextWords.has(w));
  const faithfulness = Math.min(
    1,
    groundedWords.length / Math.max(responseWords.length * 0.3, 1)
  );

  // Relevance: How well does the response address the query
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  const relevantWords = responseWords.filter((w) => queryWords.has(w));
  const relevance = Math.min(1, (relevantWords.length * 2) / Math.max(queryWords.size, 1));

  return {
    faithfulness: Math.round(faithfulness * 100) / 100,
    relevance: Math.round(relevance * 100) / 100,
  };
}

/**
 * Log token usage and costs
 */
export async function logTokenUsage(
  supabase: SupabaseClient,
  userId: string | undefined,
  model: string,
  tokensInput: number,
  tokensOutput: number,
  estimatedCost: number,
  queryType: string,
  cacheHit: boolean
): Promise<void> {
  await supabase.from("token_usage").insert({
    user_id: userId,
    model,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    estimated_cost: estimatedCost,
    query_type: queryType,
    cache_hit: cacheHit,
  });
}

/**
 * Log AI evaluation for quality tracking
 */
export async function logEvaluation(
  supabase: SupabaseClient,
  userId: string | undefined,
  query: string,
  response: string,
  context: string[],
  metrics: EvaluationMetrics,
  model: string,
  latencyMs: number
): Promise<void> {
  await supabase.from("ai_evaluations").insert({
    user_id: userId,
    query,
    response,
    context_used: context.slice(0, 5),
    faithfulness_score: metrics.faithfulness,
    relevance_score: metrics.relevance,
    model_used: model,
    latency_ms: latencyMs,
  });
}
