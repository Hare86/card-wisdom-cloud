/**
 * Model routing based on task complexity and context size
 */

import type { ModelCosts, MODEL_COSTS } from "./types.ts";

type TaskType = "chat" | "analysis" | "recommendation" | "parsing" | "extraction";

interface ModelSelection {
  model: string;
  reason: string;
}

/**
 * Select appropriate model based on task type and context length
 */
export function selectModel(taskType: TaskType, contextLength: number): ModelSelection {
  // Complex reasoning tasks with large context
  if ((taskType === "analysis" || taskType === "recommendation") && contextLength > 10000) {
    return {
      model: "google/gemini-2.5-pro",
      reason: "Large context + complex reasoning",
    };
  }

  // Complex reasoning tasks with normal context
  if (taskType === "analysis" || taskType === "recommendation") {
    return {
      model: "google/gemini-3-flash-preview",
      reason: "Complex reasoning task",
    };
  }

  // Simple Q&A or chat
  if (taskType === "chat") {
    return {
      model: "google/gemini-2.5-flash",
      reason: "Standard chat interaction",
    };
  }

  // Parsing and extraction (needs precision)
  if (taskType === "parsing" || taskType === "extraction") {
    return {
      model: "google/gemini-3-flash-preview",
      reason: "Precision extraction task",
    };
  }

  // Default
  return {
    model: "google/gemini-3-flash-preview",
    reason: "Default model",
  };
}

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  model: string,
  tokensInput: number,
  tokensOutput: number,
  modelCosts: Record<string, ModelCosts>
): number {
  const costs = modelCosts[model] || modelCosts["google/gemini-3-flash-preview"];
  return (tokensInput * costs.input + tokensOutput * costs.output) / 1_000_000;
}
