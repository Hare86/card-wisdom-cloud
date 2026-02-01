/**
 * RAG Chat Edge Function - Semantic Search Enhanced
 * 
 * Features:
 * - Vector embeddings for semantic cache lookup (92% similarity threshold)
 * - Multi-source context retrieval (documents, benefits, transactions)
 * - Dynamic model routing based on task complexity
 * - RAGAS-style evaluation metrics
 * - Streaming support with follow-up question generation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { MODEL_COSTS, SYSTEM_PROMPTS } from "./types.ts";
import type { RagRequest, ChatMessage } from "./types.ts";
import { checkSemanticCache, storeInCache } from "./semantic-cache.ts";
import { retrieveContext, buildContextSection } from "./retrieval.ts";
import { selectModel, calculateCost } from "./model-router.ts";
import { generateFollowUpQuestions } from "./follow-up.ts";
import { calculateMetrics, logTokenUsage, logEvaluation } from "./metrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      stream = true,
    }: RagRequest = await req.json();

    const lastMessage = messages[messages.length - 1]?.content || "";
    console.log(`Processing ${taskType} query: ${lastMessage.substring(0, 50)}...`);

    // Step 1: Check semantic cache (hybrid exact + vector search)
    const cachedResponse = await checkSemanticCache(supabase, lastMessage, LOVABLE_API_KEY);

    if (cachedResponse) {
      console.log(`Cache hit! Similarity: ${((cachedResponse.similarity || 1) * 100).toFixed(1)}%`);

      // Log cache hit (zero token cost)
      await logTokenUsage(
        supabase,
        userId,
        cachedResponse.model_used,
        0,
        0,
        0,
        taskType,
        true
      );

      // Generate follow-up questions for cached response
      const followUpQuestions = await generateFollowUpQuestions(
        lastMessage,
        cachedResponse.response,
        [],
        LOVABLE_API_KEY
      );

      return new Response(
        JSON.stringify({
          content: cachedResponse.response,
          cached: true,
          semanticMatch: (cachedResponse.similarity || 1) < 1,
          similarity: cachedResponse.similarity,
          model: cachedResponse.model_used,
          followUpQuestions,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Retrieve relevant context using semantic search
    let contextSection = "";
    let allContext: string[] = [];

    if (includeContext && userId) {
      const context = await retrieveContext(supabase, lastMessage, userId, LOVABLE_API_KEY);
      contextSection = buildContextSection(context);
      allContext = [
        ...context.documentChunks,
        ...context.benefitsContext,
        ...(context.transactionSummary ? [context.transactionSummary] : []),
      ];
    }

    // Step 3: Select appropriate model
    const { model: selectedModel, reason } = selectModel(
      taskType as any,
      contextSection.length
    );
    console.log(`Selected model: ${selectedModel} (${reason})`);

    // Step 4: Build prompt with context
    const systemPrompt = SYSTEM_PROMPTS[taskType] || SYSTEM_PROMPTS.chat;
    const enhancedMessages: ChatMessage[] = [
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
      // Streaming response handling
      const decoder = new TextDecoder();
      let fullResponse = "";
      let tokensInput = 0;
      let tokensOutput = 0;

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
          const text = decoder.decode(chunk, { stream: true });

          // Parse chunks to collect response
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const data = JSON.parse(line.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;

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
          // Post-stream processing
          const latency = Date.now() - startTime;
          const estimatedCost = calculateCost(selectedModel, tokensInput, tokensOutput, MODEL_COSTS);
          const metrics = calculateMetrics(lastMessage, fullResponse, allContext);

          // Store in semantic cache with embedding
          await storeInCache(
            supabase,
            lastMessage,
            fullResponse,
            selectedModel,
            tokensInput,
            tokensOutput,
            LOVABLE_API_KEY
          );

          // Log token usage
          await logTokenUsage(
            supabase,
            userId,
            selectedModel,
            tokensInput,
            tokensOutput,
            estimatedCost,
            taskType,
            false
          );

          // Log evaluation
          await logEvaluation(
            supabase,
            userId,
            lastMessage,
            fullResponse,
            allContext,
            metrics,
            selectedModel,
            latency
          );

          console.log(`Response completed: ${tokensOutput} tokens, ${latency}ms, cost: $${estimatedCost.toFixed(6)}`);
        },
      });

      // Generate follow-up questions
      const followUpQuestions = await generateFollowUpQuestions(
        lastMessage,
        "",
        allContext,
        LOVABLE_API_KEY
      );

      const transformedStream = response.body!.pipeThrough(transformStream);

      // Append follow-up questions as final SSE event
      const questionEvent = `\n\ndata: ${JSON.stringify({ followUpQuestions })}\n\n`;
      const questionBytes = new TextEncoder().encode(questionEvent);

      const combinedStream = new ReadableStream({
        async start(controller) {
          const reader = transformedStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.enqueue(questionBytes);
            controller.close();
          } catch (e) {
            controller.error(e);
          }
        },
      });

      return new Response(combinedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Non-streaming response
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const tokensInput = data.usage?.prompt_tokens || 0;
      const tokensOutput = data.usage?.completion_tokens || 0;
      const latency = Date.now() - startTime;

      const estimatedCost = calculateCost(selectedModel, tokensInput, tokensOutput, MODEL_COSTS);
      const metrics = calculateMetrics(lastMessage, content, allContext);

      // Store in semantic cache with embedding
      await storeInCache(
        supabase,
        lastMessage,
        content,
        selectedModel,
        tokensInput,
        tokensOutput,
        LOVABLE_API_KEY
      );

      // Log usage and evaluation
      await logTokenUsage(
        supabase,
        userId,
        selectedModel,
        tokensInput,
        tokensOutput,
        estimatedCost,
        taskType,
        false
      );

      await logEvaluation(
        supabase,
        userId,
        lastMessage,
        content,
        allContext,
        metrics,
        selectedModel,
        latency
      );

      // Generate follow-up questions
      const followUpQuestions = await generateFollowUpQuestions(
        lastMessage,
        content,
        allContext,
        LOVABLE_API_KEY
      );

      return new Response(
        JSON.stringify({
          content,
          model: selectedModel,
          cached: false,
          followUpQuestions,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
