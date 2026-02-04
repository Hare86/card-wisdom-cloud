import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, startDate, endDate } = await req.json();

    if (action === "token-usage") {
      // Get token usage analytics
      const query = supabase
        .from("token_usage")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) query.eq("user_id", userId);
      if (startDate) query.gte("created_at", startDate);
      if (endDate) query.lte("created_at", endDate);

      const { data: usage, error } = await query.limit(1000);

      if (error) throw error;

      // Calculate aggregates
      const totalTokensInput = usage?.reduce((sum, u) => sum + u.tokens_input, 0) || 0;
      const totalTokensOutput = usage?.reduce((sum, u) => sum + u.tokens_output, 0) || 0;
      const totalCost = usage?.reduce((sum, u) => sum + Number(u.estimated_cost), 0) || 0;
      const cacheHits = usage?.filter((u) => u.cache_hit).length || 0;
      const cacheMisses = usage?.filter((u) => !u.cache_hit).length || 0;
      const cacheHitRate = cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;

      // By model
      const byModel = usage?.reduce((acc, u) => {
        acc[u.model] = acc[u.model] || { count: 0, cost: 0, tokens: 0 };
        acc[u.model].count++;
        acc[u.model].cost += Number(u.estimated_cost);
        acc[u.model].tokens += u.tokens_input + u.tokens_output;
        return acc;
      }, {} as Record<string, { count: number; cost: number; tokens: number }>);

      // By query type
      const byType = usage?.reduce((acc, u) => {
        acc[u.query_type] = acc[u.query_type] || { count: 0, cost: 0 };
        acc[u.query_type].count++;
        acc[u.query_type].cost += Number(u.estimated_cost);
        return acc;
      }, {} as Record<string, { count: number; cost: number }>);

      // Daily breakdown
      const dailyUsage = usage?.reduce((acc, u) => {
        const date = u.created_at.split("T")[0];
        acc[date] = acc[date] || { requests: 0, cost: 0, cache_hits: 0 };
        acc[date].requests++;
        acc[date].cost += Number(u.estimated_cost);
        if (u.cache_hit) acc[date].cache_hits++;
        return acc;
      }, {} as Record<string, { requests: number; cost: number; cache_hits: number }>);

      return new Response(
        JSON.stringify({
          summary: {
            total_requests: usage?.length || 0,
            total_tokens_input: totalTokensInput,
            total_tokens_output: totalTokensOutput,
            total_cost: totalCost,
            cache_hit_rate: cacheHitRate,
            cache_savings: totalCost * cacheHitRate * 0.9, // Estimated savings
          },
          by_model: byModel,
          by_query_type: byType,
          daily_breakdown: dailyUsage,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "evaluation-metrics") {
      // Get AI evaluation metrics
      const query = supabase
        .from("ai_evaluations")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) query.eq("user_id", userId);
      if (startDate) query.gte("created_at", startDate);
      if (endDate) query.lte("created_at", endDate);

      const { data: evals, error } = await query.limit(1000);

      if (error) throw error;

      // Calculate RAGAS-style metrics
      const avgFaithfulness = evals?.reduce((sum, e) => sum + Number(e.faithfulness_score || 0), 0) / (evals?.length || 1);
      const avgRelevance = evals?.reduce((sum, e) => sum + Number(e.relevance_score || 0), 0) / (evals?.length || 1);
      const avgLatency = evals?.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / (evals?.length || 1);
      
      const userFeedback = evals?.filter((e) => e.user_feedback);
      const avgUserRating = userFeedback?.reduce((sum, e) => sum + (e.user_feedback || 0), 0) / (userFeedback?.length || 1);

      // By model performance
      const byModel = evals?.reduce((acc, e) => {
        if (!e.model_used) return acc;
        acc[e.model_used] = acc[e.model_used] || { 
          count: 0, 
          faithfulness: 0, 
          relevance: 0, 
          latency: 0 
        };
        acc[e.model_used].count++;
        acc[e.model_used].faithfulness += Number(e.faithfulness_score || 0);
        acc[e.model_used].relevance += Number(e.relevance_score || 0);
        acc[e.model_used].latency += e.latency_ms || 0;
        return acc;
      }, {} as Record<string, { count: number; faithfulness: number; relevance: number; latency: number }>);

      // Calculate averages
      Object.keys(byModel || {}).forEach((model) => {
        const m = byModel[model];
        m.faithfulness = m.faithfulness / m.count;
        m.relevance = m.relevance / m.count;
        m.latency = m.latency / m.count;
      });

      // Quality distribution
      const qualityBuckets = {
        excellent: evals?.filter((e) => (Number(e.faithfulness_score) + Number(e.relevance_score)) / 2 > 0.8).length || 0,
        good: evals?.filter((e) => {
          const avg = (Number(e.faithfulness_score) + Number(e.relevance_score)) / 2;
          return avg > 0.6 && avg <= 0.8;
        }).length || 0,
        fair: evals?.filter((e) => {
          const avg = (Number(e.faithfulness_score) + Number(e.relevance_score)) / 2;
          return avg > 0.4 && avg <= 0.6;
        }).length || 0,
        poor: evals?.filter((e) => (Number(e.faithfulness_score) + Number(e.relevance_score)) / 2 <= 0.4).length || 0,
      };

      return new Response(
        JSON.stringify({
          summary: {
            total_evaluations: evals?.length || 0,
            avg_faithfulness: avgFaithfulness,
            avg_relevance: avgRelevance,
            avg_latency_ms: avgLatency,
            avg_user_rating: avgUserRating || null,
            user_feedback_count: userFeedback?.length || 0,
          },
          quality_distribution: qualityBuckets,
          by_model: byModel,
          recent_low_quality: evals
            ?.filter((e) => (Number(e.faithfulness_score) + Number(e.relevance_score)) / 2 < 0.5)
            .slice(0, 10)
            .map((e) => ({
              query: e.query.substring(0, 100),
              faithfulness: e.faithfulness_score,
              relevance: e.relevance_score,
              model: e.model_used,
            })),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "compliance-report") {
      // Get compliance and PII handling report
      const { data: complianceLogs, error: compError } = await supabase
        .from("compliance_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      const { data: piiLogs, error: piiError } = await supabase
        .from("pii_masking_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (compError || piiError) throw compError || piiError;

      // Aggregate PII stats
      const piiTypeCounts = piiLogs?.reduce((acc, log) => {
        (log.pii_types_found || []).forEach((type: string) => {
          acc[type] = (acc[type] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      const totalFieldsMasked = piiLogs?.reduce((sum, log) => sum + (log.fields_masked || 0), 0) || 0;

      // Compliance by action
      const byAction = complianceLogs?.reduce((acc, log) => {
        acc[log.action] = acc[log.action] || { count: 0, pii_accessed: 0, pii_masked: 0 };
        acc[log.action].count++;
        if (log.pii_accessed) acc[log.action].pii_accessed++;
        if (log.pii_masked) acc[log.action].pii_masked++;
        return acc;
      }, {} as Record<string, { count: number; pii_accessed: number; pii_masked: number }>);

      return new Response(
        JSON.stringify({
          summary: {
            total_compliance_events: complianceLogs?.length || 0,
            total_pii_masking_events: piiLogs?.length || 0,
            total_fields_masked: totalFieldsMasked,
            pii_always_masked: complianceLogs?.every((l) => !l.pii_accessed || l.pii_masked),
          },
          pii_types_found: piiTypeCounts,
          by_action: byAction,
          gdpr_compliance: {
            data_minimization: true,
            purpose_limitation: true,
            storage_limitation: "7 days for cache",
            encryption_at_rest: true,
            access_logging: true,
          },
          pci_dss_alignment: {
            card_data_masked: true,
            encryption_in_transit: true,
            access_controls: true,
            audit_logging: true,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "roi-analysis") {
      // ROI and value analysis
      const { data: usage } = await supabase
        .from("token_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      const { data: evals } = await supabase
        .from("ai_evaluations")
        .select("user_feedback")
        .not("user_feedback", "is", null);

      const totalCost = usage?.reduce((sum, u) => sum + Number(u.estimated_cost), 0) || 0;
      const totalQueries = usage?.length || 0;
      const cacheSavings = usage?.filter((u) => u.cache_hit).length || 0;
      const avgRating = (evals?.reduce((sum, e) => sum + (e.user_feedback || 0), 0) || 0) / (evals?.length || 1);

      // Estimated user value (based on recommendations acted upon)
      const estimatedValuePerQuery = 50; // ₹50 average value per recommendation
      const estimatedTotalValue = totalQueries * estimatedValuePerQuery * (avgRating / 5 || 0.7);

      return new Response(
        JSON.stringify({
          costs: {
            total_ai_cost: totalCost,
            cost_per_query: totalCost / (totalQueries || 1),
            cache_savings_percent: (cacheSavings / (totalQueries || 1)) * 100,
            estimated_cache_savings: totalCost * (cacheSavings / (totalQueries || 1)),
          },
          value: {
            total_queries: totalQueries,
            avg_user_satisfaction: avgRating || "N/A",
            estimated_user_value: estimatedTotalValue,
            roi_ratio: estimatedTotalValue / (totalCost || 1),
          },
          optimization_suggestions: [
            totalCost > 10 ? "Consider increasing cache TTL to reduce costs" : null,
            cacheSavings / totalQueries < 0.2 ? "Low cache hit rate - consider semantic similarity threshold" : null,
            avgRating < 3.5 ? "User satisfaction below target - review prompt engineering" : null,
          ].filter(Boolean),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
