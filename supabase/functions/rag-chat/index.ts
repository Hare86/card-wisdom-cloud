import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Token costs per 1M tokens (approximate)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "openai/gpt-5": { input: 5.00, output: 15.00 },
  "openai/gpt-5-mini": { input: 0.15, output: 0.60 },
};

// Model selection based on task complexity
function selectModel(taskType: string, contextLength: number): string {
  // Complex reasoning tasks
  if (taskType === "analysis" || taskType === "recommendation") {
    return contextLength > 10000 ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
  }
  
  // Simple Q&A or chat
  if (taskType === "chat" || taskType === "simple") {
    return "google/gemini-2.5-flash";
  }
  
  // Parsing and extraction (needs precision)
  if (taskType === "parsing" || taskType === "extraction") {
    return "google/gemini-3-flash-preview";
  }
  
  return "google/gemini-3-flash-preview";
}

// Generate cache key hash
async function generateCacheKey(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Calculate RAGAS-style metrics
function calculateMetrics(
  query: string,
  response: string,
  context: string[]
): { faithfulness: number; relevance: number } {
  // Simplified metric calculation
  // In production, this would use a separate LLM call for evaluation
  
  // Faithfulness: How much of the response is grounded in context
  const contextWords = new Set(context.join(" ").toLowerCase().split(/\s+/));
  const responseWords = response.toLowerCase().split(/\s+/);
  const groundedWords = responseWords.filter((w) => contextWords.has(w));
  const faithfulness = Math.min(1, groundedWords.length / Math.max(responseWords.length * 0.3, 1));

  // Relevance: How well does the response address the query
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  const relevantWords = responseWords.filter((w) => queryWords.has(w));
  const relevance = Math.min(1, (relevantWords.length * 2) / Math.max(queryWords.size, 1));

  return {
    faithfulness: Math.round(faithfulness * 100) / 100,
    relevance: Math.round(relevance * 100) / 100,
  };
}

// System prompts for different task types
const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `You are an expert Credit Card Reward Intelligence Assistant. You help users:
- Understand their credit card benefits, reward rates, and earning categories
- Track points across multiple cards
- Find the best redemption options (airline transfers, hotel bookings, cashback)
- Alert them about expiring points and milestone achievements
Keep responses concise and actionable. Use bullet points for clarity.`,

  analysis: `You are a financial analyst specializing in credit card rewards optimization.
Analyze the provided data and give detailed insights on:
- Spending patterns and category distribution
- Reward earning efficiency
- Opportunities for optimization
- Comparative analysis with other cards
Provide data-driven recommendations with specific numbers.`,

  recommendation: `You are a rewards optimization expert. Based on the context provided:
- Identify the highest-value redemption opportunities
- Calculate point values for different redemption options
- Recommend specific actions with estimated savings
- Consider transfer partners, sweet spots, and promotions
Always include specific numbers and percentages.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      messages, 
      userId, 
      taskType = "chat",
      includeContext = true,
      stream = true 
    } = await req.json();

    const lastMessage = messages[messages.length - 1]?.content || "";
    console.log(`Processing ${taskType} query: ${lastMessage.substring(0, 50)}...`);

    // Step 1: Check semantic cache
    const cacheKey = await generateCacheKey(lastMessage);
    const { data: cachedResponse } = await supabase
      .from("query_cache")
      .select("*")
      .eq("query_hash", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedResponse) {
      console.log("Cache hit! Returning cached response");
      
      // Update hit count
      await supabase
        .from("query_cache")
        .update({ hit_count: cachedResponse.hit_count + 1 })
        .eq("id", cachedResponse.id);

      // Log token usage (cache hit)
      await supabase.from("token_usage").insert({
        user_id: userId,
        model: cachedResponse.model_used,
        tokens_input: 0,
        tokens_output: 0,
        estimated_cost: 0,
        query_type: taskType,
        cache_hit: true,
      });

      // Return cached response (non-streaming for cache hits)
      return new Response(
        JSON.stringify({ 
          content: cachedResponse.response, 
          cached: true,
          model: cachedResponse.model_used 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Retrieve relevant context (RAG)
    let contextChunks: string[] = [];
    let benefitsContext: string[] = [];

    if (includeContext && userId) {
      // Get user's document chunks
      const { data: userDocs } = await supabase
        .from("document_chunks")
        .select("chunk_text, metadata")
        .eq("user_id", userId)
        .limit(10);

      if (userDocs) {
        contextChunks = userDocs.map((d) => d.chunk_text);
      }

      // Get relevant card benefits
      const { data: benefits } = await supabase
        .from("card_benefits")
        .select("bank_name, card_name, benefit_title, benefit_description")
        .eq("is_active", true)
        .limit(10);

      if (benefits) {
        benefitsContext = benefits.map(
          (b) => `${b.bank_name} ${b.card_name}: ${b.benefit_title} - ${b.benefit_description}`
        );
      }

      // Get user's transaction summary
      const { data: transactions } = await supabase
        .from("transactions")
        .select("category, amount, points_earned")
        .eq("user_id", userId)
        .limit(100);

      if (transactions && transactions.length > 0) {
        const summary = transactions.reduce((acc, t) => {
          acc[t.category] = acc[t.category] || { amount: 0, points: 0 };
          acc[t.category].amount += Math.abs(t.amount);
          acc[t.category].points += t.points_earned;
          return acc;
        }, {} as Record<string, { amount: number; points: number }>);

        contextChunks.push(`User spending summary: ${JSON.stringify(summary)}`);
      }
    }

    // Step 3: Select appropriate model
    const totalContextLength = contextChunks.join("").length + benefitsContext.join("").length;
    const selectedModel = selectModel(taskType, totalContextLength);
    console.log(`Selected model: ${selectedModel}`);

    // Step 4: Build prompt with context
    const systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS.chat;
    const contextSection = [...contextChunks, ...benefitsContext].length > 0
      ? `\n\nRELEVANT CONTEXT:\n${[...contextChunks, ...benefitsContext].join("\n\n")}`
      : "";

    const enhancedMessages = [
      { role: "system", content: systemPrompt + contextSection },
      ...messages,
    ];

    // Step 5: Call AI API
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: enhancedMessages,
        stream,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${status}`);
    }

    if (stream) {
      // For streaming, we need to collect the response for caching
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let tokensInput = 0;
      let tokensOutput = 0;

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          controller.enqueue(chunk);

          // Parse chunks to collect response
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
                
                // Try to get usage info
                if (data.usage) {
                  tokensInput = data.usage.prompt_tokens || 0;
                  tokensOutput = data.usage.completion_tokens || 0;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        },
        async flush() {
          // Cache the response after streaming completes
          const latency = Date.now() - startTime;
          const costs = MODEL_COSTS[selectedModel] || MODEL_COSTS["google/gemini-3-flash-preview"];
          const estimatedCost = (tokensInput * costs.input + tokensOutput * costs.output) / 1_000_000;

          // Calculate metrics
          const metrics = calculateMetrics(lastMessage, fullResponse, [...contextChunks, ...benefitsContext]);

          // Store in cache
          await supabase.from("query_cache").insert({
            query_hash: cacheKey,
            query_text: lastMessage,
            response: fullResponse,
            model_used: selectedModel,
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
          });

          // Log token usage
          await supabase.from("token_usage").insert({
            user_id: userId,
            model: selectedModel,
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
            estimated_cost: estimatedCost,
            query_type: taskType,
            cache_hit: false,
          });

          // Log evaluation
          await supabase.from("ai_evaluations").insert({
            user_id: userId,
            query: lastMessage,
            response: fullResponse,
            context_used: [...contextChunks, ...benefitsContext].slice(0, 5),
            faithfulness_score: metrics.faithfulness,
            relevance_score: metrics.relevance,
            model_used: selectedModel,
            latency_ms: latency,
          });

          console.log(`Response completed: ${tokensOutput} tokens, ${latency}ms, cost: $${estimatedCost.toFixed(6)}`);
        },
      });

      const transformedStream = response.body!.pipeThrough(transformStream);

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Non-streaming response
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const tokensInput = data.usage?.prompt_tokens || 0;
      const tokensOutput = data.usage?.completion_tokens || 0;
      const latency = Date.now() - startTime;

      const costs = MODEL_COSTS[selectedModel] || MODEL_COSTS["google/gemini-3-flash-preview"];
      const estimatedCost = (tokensInput * costs.input + tokensOutput * costs.output) / 1_000_000;

      // Cache response
      await supabase.from("query_cache").insert({
        query_hash: cacheKey,
        query_text: lastMessage,
        response: content,
        model_used: selectedModel,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
      });

      // Log usage
      await supabase.from("token_usage").insert({
        user_id: userId,
        model: selectedModel,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        estimated_cost: estimatedCost,
        query_type: taskType,
        cache_hit: false,
      });

      return new Response(JSON.stringify({ content, model: selectedModel, cached: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("RAG chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
