/**
 * Type definitions for RAG chat function
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RagRequest {
  messages: ChatMessage[];
  userId?: string;
  taskType?: "chat" | "analysis" | "recommendation" | "parsing" | "extraction";
  includeContext?: boolean;
  stream?: boolean;
}

export interface RagResponse {
  content: string;
  cached: boolean;
  model: string;
  followUpQuestions?: string[];
  semanticMatch?: boolean;
  similarity?: number;
}

export interface CacheEntry {
  id: string;
  query_text: string;
  response: string;
  model_used: string;
  similarity?: number;
}

export interface RetrievedContext {
  documentChunks: string[];
  benefitsContext: string[];
  transactionSummary: string | null;
}

export interface ModelCosts {
  input: number;
  output: number;
}

export const MODEL_COSTS: Record<string, ModelCosts> = {
  "google/gemini-3-flash-preview": { input: 0.10, output: 0.40 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
  "openai/gpt-5": { input: 5.00, output: 15.00 },
  "openai/gpt-5-mini": { input: 0.15, output: 0.60 },
};

export const SYSTEM_PROMPTS: Record<string, string> = {
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
